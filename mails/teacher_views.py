"""
Teacher views — Full CRUD + DB Explorer using MongoDB Atlas (pymongo).
"""
import uuid
from datetime import datetime, timezone

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from bson import ObjectId
from pymongo import MongoClient

from .mongo import get_collection, get_db
from django.conf import settings

TEACHERS_COLLECTION = 'teachers'


def serialize_doc(doc):
    """Convert ObjectId and datetime fields to JSON-serializable types."""
    if doc is None:
        return None
    result = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, list):
            result[k] = [str(i) if isinstance(i, ObjectId) else i for i in v]
        else:
            result[k] = v
    return result


def find_teacher(col, teacher_id):
    """Lookup by _id or teacher_id field."""
    try:
        doc = col.find_one({'_id': ObjectId(teacher_id)})
        if doc:
            return doc
    except Exception:
        pass
    return col.find_one({'teacher_id': teacher_id})


# ──────────────────────────────────────────────
# TEACHER LIST & CREATE
# ──────────────────────────────────────────────
@api_view(['GET', 'POST'])
def teacher_list(request):
    col = get_collection(TEACHERS_COLLECTION)

    if request.method == 'GET':
        # Filtering
        status_filter = request.query_params.get('status', '')
        department_filter = request.query_params.get('department', '')
        search = request.query_params.get('search', '').strip()

        query = {}
        if status_filter:
            query['status'] = status_filter
        if department_filter:
            query['department'] = department_filter
        if search:
            query['$or'] = [
                {'name': {'$regex': search, '$options': 'i'}},
                {'subject': {'$regex': search, '$options': 'i'}},
                {'email': {'$regex': search, '$options': 'i'}},
                {'department': {'$regex': search, '$options': 'i'}},
            ]

        teachers = list(col.find(query).sort('name', 1))
        return Response([serialize_doc(t) for t in teachers])

    elif request.method == 'POST':
        data = request.data
        teacher = {
            'teacher_id': str(uuid.uuid4()),
            'name': data.get('name', ''),
            'email': data.get('email', ''),
            'phone': data.get('phone', ''),
            'subject': data.get('subject', ''),
            'department': data.get('department', ''),
            'qualification': data.get('qualification', ''),
            'experience_years': int(data.get('experience_years', 0)),
            'salary': float(data.get('salary', 0)),
            'status': data.get('status', 'active'),
            'gender': data.get('gender', ''),
            'avatar_color': data.get('avatar_color', '#6366f1'),
            'rating': float(data.get('rating', 4.0)),
            'students_count': int(data.get('students_count', 0)),
            'classes': data.get('classes', []),
            'joined_date': data.get('joined_date', datetime.now(timezone.utc).strftime('%Y-%m-%d')),
            'address': data.get('address', ''),
            'bio': data.get('bio', ''),
            'awards': data.get('awards', []),
            'createdAt': datetime.now(timezone.utc).isoformat(),
        }
        result = col.insert_one(teacher)
        teacher['_id'] = str(result.inserted_id)
        return Response(teacher, status=status.HTTP_201_CREATED)


# ──────────────────────────────────────────────
# TEACHER DETAIL, UPDATE, DELETE
# ──────────────────────────────────────────────
@api_view(['GET', 'PATCH', 'DELETE'])
def teacher_detail(request, teacher_id):
    col = get_collection(TEACHERS_COLLECTION)
    teacher = find_teacher(col, teacher_id)

    if not teacher:
        return Response({'error': 'Teacher not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(serialize_doc(teacher))

    elif request.method == 'PATCH':
        allowed = {
            'name', 'email', 'phone', 'subject', 'department', 'qualification',
            'experience_years', 'salary', 'status', 'gender', 'rating',
            'students_count', 'classes', 'joined_date', 'address', 'bio',
            'awards', 'avatar_color'
        }
        update = {k: v for k, v in request.data.items() if k in allowed}
        if update:
            col.update_one({'_id': teacher['_id']}, {'$set': update})
        updated = col.find_one({'_id': teacher['_id']})
        return Response(serialize_doc(updated))

    elif request.method == 'DELETE':
        col.delete_one({'_id': teacher['_id']})
        return Response({'message': 'Teacher deleted'}, status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────────
# TEACHER STATS
# ──────────────────────────────────────────────
@api_view(['GET'])
def teacher_stats(request):
    col = get_collection(TEACHERS_COLLECTION)
    total = col.count_documents({})
    active = col.count_documents({'status': 'active'})
    on_leave = col.count_documents({'status': 'on_leave'})

    # Aggregate total students
    pipeline = [{'$group': {'_id': None, 'total_students': {'$sum': '$students_count'}, 'avg_rating': {'$avg': '$rating'}, 'avg_salary': {'$avg': '$salary'}}}]
    agg = list(col.aggregate(pipeline))
    agg_data = agg[0] if agg else {}

    # Department breakdown
    dept_pipeline = [{'$group': {'_id': '$department', 'count': {'$sum': 1}}}]
    dept_data = {d['_id']: d['count'] for d in col.aggregate(dept_pipeline)}

    return Response({
        'total': total,
        'active': active,
        'on_leave': on_leave,
        'inactive': total - active - on_leave,
        'total_students': agg_data.get('total_students', 0),
        'avg_rating': round(agg_data.get('avg_rating', 0), 2),
        'avg_salary': round(agg_data.get('avg_salary', 0), 2),
        'departments': dept_data,
    })


# ──────────────────────────────────────────────
# DB EXPLORER — Your Atlas databases overview
# ──────────────────────────────────────────────
@api_view(['GET'])
def db_explorer(request):
    """Return overview of all MongoDB Atlas databases and collections."""
    try:
        client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=8000)
        all_dbs = client.list_database_names()

        # Skip system/empty DBs
        skip_dbs = {'admin', 'local', 'config'}
        result = []

        for dbname in all_dbs:
            if dbname in skip_dbs:
                continue
            db = client[dbname]
            collections = []
            try:
                col_names = db.list_collection_names()
                for col_name in col_names:
                    try:
                        count = db[col_name].count_documents({})
                        collections.append({'name': col_name, 'count': count})
                    except Exception:
                        collections.append({'name': col_name, 'count': 0})
            except Exception:
                pass

            total_docs = sum(c['count'] for c in collections)
            result.append({
                'database': dbname,
                'collections': collections,
                'total_docs': total_docs,
                'collection_count': len(collections),
            })

        result.sort(key=lambda x: x['total_docs'], reverse=True)
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

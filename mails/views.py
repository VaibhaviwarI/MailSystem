"""
Mail views — full CRUD using pymongo directly.
No Django ORM needed — raw pymongo for MongoDB 6.x compatibility.
"""
import uuid
from datetime import datetime, timezone

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .mongo import get_collection

MAILS_COLLECTION = 'mails'


def serialize_mail(mail):
    """Convert pymongo document to JSON-serializable dict."""
    if mail is None:
        return None
    mail['_id'] = str(mail['_id'])
    return mail


def seed_sample_mails(col):
    """Seed the DB with sample mails if empty."""
    if col.count_documents({}) == 0:
        sample_mails = [
            {
                "mail_id": str(uuid.uuid4()),
                "from_email": "sarah.johnson@gmail.com",
                "from_name": "Sarah Johnson",
                "to": "me@maildash.com",
                "subject": "Project Kickoff Meeting Tomorrow 🚀",
                "body": "Hi there!\n\nJust a reminder that we have our project kickoff meeting tomorrow at 10 AM. Please make sure to review the attached agenda and come prepared with your ideas.\n\nLooking forward to seeing everyone there!\n\nBest,\nSarah",
                "timestamp": datetime(2026, 11, 20, 9, 30, tzinfo=timezone.utc).isoformat(),
                "is_read": False,
                "is_starred": True,
                "is_trash": False,
                "folder": "inbox",
                "avatar_color": "#6366f1",
            },
            {
                "mail_id": str(uuid.uuid4()),
                "from_email": "alex.kumar@techcorp.com",
                "from_name": "Alex Kumar",
                "to": "me@maildash.com",
                "subject": "Design Review Feedback",
                "body": "Hey,\n\nI've reviewed the latest design mockups and I have a few suggestions:\n\n1. The color palette looks great, very modern\n2. Consider increasing the font size in the mobile view\n3. The navigation menu could use better spacing\n\nOverall, great work! Let's discuss further.\n\nCheers,\nAlex",
                "timestamp": datetime(2026, 11, 20, 8, 15, tzinfo=timezone.utc).isoformat(),
                "is_read": True,
                "is_starred": False,
                "is_trash": False,
                "folder": "inbox",
                "avatar_color": "#10b981",
            },
            {
                "mail_id": str(uuid.uuid4()),
                "from_email": "noreply@github.com",
                "from_name": "GitHub",
                "to": "me@maildash.com",
                "subject": "[GitHub] New pull request opened: feat/mail-dashboard",
                "body": "A new pull request has been opened in your repository.\n\nRepository: maildashboard\nPR #42: feat/mail-dashboard\nOpened by: dev-contributor\n\nPlease review and merge when ready.",
                "timestamp": datetime(2026, 11, 19, 22, 45, tzinfo=timezone.utc).isoformat(),
                "is_read": True,
                "is_starred": False,
                "is_trash": False,
                "folder": "inbox",
                "avatar_color": "#1f2937",
            },
            {
                "mail_id": str(uuid.uuid4()),
                "from_email": "priya.sharma@startup.io",
                "from_name": "Priya Sharma",
                "to": "me@maildash.com",
                "subject": "Partnership Opportunity 🤝",
                "body": "Hello,\n\nI hope this message finds you well. I'm reaching out from Startup.io regarding a potential partnership that could benefit both our organizations.\n\nWe specialize in AI-powered productivity tools and believe there's a strong synergy between our products.\n\nWould you be open to a 30-minute call this week?\n\nBest regards,\nPriya Sharma\nHead of Partnerships",
                "timestamp": datetime(2026, 11, 19, 16, 0, tzinfo=timezone.utc).isoformat(),
                "is_read": False,
                "is_starred": True,
                "is_trash": False,
                "folder": "inbox",
                "avatar_color": "#f59e0b",
            },
            {
                "mail_id": str(uuid.uuid4()),
                "from_email": "me@maildash.com",
                "from_name": "Me",
                "to": "team@company.com",
                "subject": "Weekly Status Update - Week 47",
                "body": "Hi Team,\n\nHere's the weekly update:\n\n✅ Completed: Mail Dashboard UI\n🔄 In Progress: Backend API integration\n📋 Planned: Testing & deployment\n\nAll systems are on track for the December deadline.\n\nRegards",
                "timestamp": datetime(2026, 11, 18, 14, 30, tzinfo=timezone.utc).isoformat(),
                "is_read": True,
                "is_starred": False,
                "is_trash": False,
                "folder": "sent",
                "avatar_color": "#8b5cf6",
            },
            {
                "mail_id": str(uuid.uuid4()),
                "from_email": "me@maildash.com",
                "from_name": "Me",
                "to": "",
                "subject": "Blog Post: The Future of Email [DRAFT]",
                "body": "# The Future of Email\n\nEmail has been around for decades, but the way we interact with it is fundamentally changing...\n\n[Continue writing...]",
                "timestamp": datetime(2026, 11, 17, 11, 0, tzinfo=timezone.utc).isoformat(),
                "is_read": True,
                "is_starred": False,
                "is_trash": False,
                "folder": "drafts",
                "avatar_color": "#6366f1",
            },
            {
                "mail_id": str(uuid.uuid4()),
                "from_email": "spam@ads.net",
                "from_name": "Promo Team",
                "to": "me@maildash.com",
                "subject": "YOU WON A PRIZE!!!",
                "body": "Congratulations! You have been selected...",
                "timestamp": datetime(2026, 11, 15, 8, 0, tzinfo=timezone.utc).isoformat(),
                "is_read": False,
                "is_starred": False,
                "is_trash": True,
                "folder": "trash",
                "avatar_color": "#ef4444",
            },
        ]
        col.insert_many(sample_mails)


@api_view(['GET', 'POST'])
def mail_list(request):
    col = get_collection(MAILS_COLLECTION)
    seed_sample_mails(col)

    if request.method == 'GET':
        folder = request.query_params.get('folder', 'inbox')
        starred_only = request.query_params.get('starred', '').lower() == 'true'

        if starred_only:
            query = {'is_starred': True, 'is_trash': False}
        elif folder == 'trash':
            query = {'is_trash': True}
        elif folder == 'all':
            query = {}
        else:
            query = {'folder': folder, 'is_trash': False}

        mails = list(col.find(query).sort('timestamp', -1))
        return Response([serialize_mail(m) for m in mails])

    elif request.method == 'POST':
        data = request.data
        mail = {
            "mail_id": str(uuid.uuid4()),
            "from_email": data.get('from_email', 'me@maildash.com'),
            "from_name": data.get('from_name', 'Me'),
            "to": data.get('to', ''),
            "subject": data.get('subject', '(No Subject)'),
            "body": data.get('body', ''),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_read": True,
            "is_starred": False,
            "is_trash": False,
            "folder": data.get('folder', 'sent'),
            "avatar_color": data.get('avatar_color', '#6366f1'),
        }
        result = col.insert_one(mail)
        mail['_id'] = str(result.inserted_id)
        return Response(mail, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
def mail_detail(request, mail_id):
    from bson import ObjectId
    col = get_collection(MAILS_COLLECTION)

    # Support lookup by both _id and mail_id
    try:
        oid = ObjectId(mail_id)
        mail = col.find_one({'_id': oid})
    except Exception:
        mail = col.find_one({'mail_id': mail_id})

    if not mail:
        return Response({'error': 'Mail not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        # Mark as read
        col.update_one({'_id': mail['_id']}, {'$set': {'is_read': True}})
        mail['is_read'] = True
        return Response(serialize_mail(mail))

    elif request.method == 'PATCH':
        update_data = request.data
        allowed = {'is_read', 'is_starred', 'is_trash', 'folder', 'subject', 'body', 'to'}
        update = {k: v for k, v in update_data.items() if k in allowed}
        if update:
            col.update_one({'_id': mail['_id']}, {'$set': update})
        updated = col.find_one({'_id': mail['_id']})
        return Response(serialize_mail(updated))

    elif request.method == 'DELETE':
        col.delete_one({'_id': mail['_id']})
        return Response({'message': 'Mail deleted'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def mail_stats(request):
    col = get_collection(MAILS_COLLECTION)
    seed_sample_mails(col)
    stats = {
        'inbox': col.count_documents({'folder': 'inbox', 'is_trash': False}),
        'inbox_unread': col.count_documents({'folder': 'inbox', 'is_trash': False, 'is_read': False}),
        'sent': col.count_documents({'folder': 'sent', 'is_trash': False}),
        'drafts': col.count_documents({'folder': 'drafts', 'is_trash': False}),
        'starred': col.count_documents({'is_starred': True, 'is_trash': False}),
        'trash': col.count_documents({'is_trash': True}),
        'total': col.count_documents({}),
    }
    return Response(stats)

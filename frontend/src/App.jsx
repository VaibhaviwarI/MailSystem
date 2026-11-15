import { useState, useEffect, useCallback } from 'react'
import {
  getMails, getMailStats, createMail, updateMail,
  getTeachers, getTeacherStats, createTeacher, updateTeacher, deleteTeacher,
  getDbExplorer
} from './api'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Inbox, Star, Send, FileText, Trash2, RefreshCw, Search,
  X, Mail, ChevronRight, CheckCircle, AlertCircle, Info, Plus,
  GraduationCap, Database, Users, BookOpen, Award, Phone,
  MapPin, Calendar, TrendingUp, Edit3, Trash, Eye, Filter,
  BarChart2, Layers, ChevronDown, ChevronUp, Briefcase
} from 'lucide-react'
import './index.css'

// ===================== UTILITY =====================
function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
function formatTime(ts) {
  try { return formatDistanceToNow(parseISO(ts), { addSuffix: true }) }
  catch { return ts || '' }
}
function fmt(n) { return Number(n || 0).toLocaleString('en-IN') }

// ===================== TOAST =====================
function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => removeToast(t.id)}>
          {t.type === 'success' && <CheckCircle size={16} color="#10b981" />}
          {t.type === 'error' && <AlertCircle size={16} color="#ef4444" />}
          {t.type === 'info' && <Info size={16} color="#6366f1" />}
          {t.message}
        </div>
      ))}
    </div>
  )
}
function useToasts() {
  const [toasts, setToasts] = useState([])
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])
  return { toasts, addToast, removeToast }
}

// ===================== SIDEBAR =====================
const MAIL_FOLDERS = [
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'starred', label: 'Starred', icon: Star, starred: true },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'drafts', label: 'Drafts', icon: FileText },
  { key: 'trash', label: 'Trash', icon: Trash2 },
]

function Sidebar({ view, activeFolder, onFolderChange, onViewChange, onCompose, mailStats, teacherStats }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">✉️</div>
          <span className="logo-text">MailDash</span>
        </div>
      </div>

      <button className="compose-btn" onClick={onCompose} id="compose-btn">
        <Plus size={16} /><span>Compose</span>
      </button>

      <nav className="sidebar-nav">
        {/* ── MAIL Section ── */}
        <div className="nav-section-label">Mail</div>
        {MAIL_FOLDERS.map(({ key, label, icon: Icon, starred }) => {
          const isActive = view === 'mail' && (starred ? activeFolder === 'starred' : activeFolder === key && activeFolder !== 'starred')
          const badge = key === 'inbox' ? mailStats?.inbox_unread : key === 'drafts' ? mailStats?.drafts : null
          return (
            <div key={key} id={`nav-${key}`}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => { onViewChange('mail'); onFolderChange(starred ? 'starred' : key) }}>
              <Icon className="icon" size={16} />
              <span className="label">{label}</span>
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </div>
          )
        })}

        {/* ── TEACHERS Section ── */}
        <div className="nav-section-label" style={{ marginTop: 12 }}>Academics</div>
        <div id="nav-teachers"
          className={`nav-item ${view === 'teachers' ? 'active' : ''}`}
          onClick={() => onViewChange('teachers')}>
          <GraduationCap className="icon" size={16} />
          <span className="label">Teachers</span>
          {teacherStats?.total > 0 && <span className="nav-badge" style={{ background: '#10b981' }}>{teacherStats.total}</span>}
        </div>

        {/* ── DB Explorer Section ── */}
        <div className="nav-section-label" style={{ marginTop: 12 }}>System</div>
        <div id="nav-db-explorer"
          className={`nav-item ${view === 'dbexplorer' ? 'active' : ''}`}
          onClick={() => onViewChange('dbexplorer')}>
          <Database className="icon" size={16} />
          <span className="label">DB Explorer</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="storage-info">Atlas Connected ✓</div>
        <div className="storage-bar"><div className="storage-fill" /></div>
      </div>
    </aside>
  )
}

// ===================== MAIL LIST =====================
function MailItem({ mail, selected, onClick, onToggleStar }) {
  return (
    <div className={`mail-item ${!mail.is_read ? 'unread' : ''} ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="mail-item-top">
        <div className="avatar" style={{ background: mail.avatar_color || '#6366f1' }}>{getInitials(mail.from_name)}</div>
        <div className="mail-meta">
          <div className="mail-from">{mail.from_name || mail.from_email}</div>
          <div className="mail-time">{formatTime(mail.timestamp)}</div>
        </div>
        <button className={`star-btn ${mail.is_starred ? 'starred' : ''}`}
          onClick={e => { e.stopPropagation(); onToggleStar() }}
          title={mail.is_starred ? 'Unstar' : 'Star'}>
          <Star size={14} fill={mail.is_starred ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="mail-subject">{mail.subject}</div>
      <div className="mail-preview">{mail.body?.replace(/\n/g, ' ')}</div>
    </div>
  )
}

function MailListPanel({ folder, mails, loading, selectedId, onSelect, onRefresh, onToggleStar }) {
  const [search, setSearch] = useState('')
  const filtered = mails.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return m.subject?.toLowerCase().includes(q) || m.from_name?.toLowerCase().includes(q) || m.body?.toLowerCase().includes(q)
  })
  const folderLabel = { inbox: 'Inbox', starred: 'Starred', sent: 'Sent', drafts: 'Drafts', trash: 'Trash' }[folder] || 'Inbox'

  return (
    <div className="mail-list-panel">
      <div className="panel-header">
        <div className="panel-header-top">
          <h2 className="panel-title">{folderLabel}</h2>
          <div className="panel-actions">
            <button className="icon-btn" onClick={onRefresh} title="Refresh" id="refresh-btn"><RefreshCw size={14} /></button>
          </div>
        </div>
        <div className="search-box">
          <Search className="search-icon" />
          <input id="search-input" type="text" placeholder="Search mail…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      {loading ? (
        <div className="loading-wrap"><div className="spinner" /><span className="loading-text">Loading…</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📭</div><h3>No mail here</h3><p>{search ? 'No results.' : 'This folder is empty.'}</p></div>
      ) : (
        <div className="mail-list">
          {filtered.map(mail => (
            <MailItem key={mail._id} mail={mail} selected={mail._id === selectedId}
              onClick={() => onSelect(mail)} onToggleStar={() => onToggleStar(mail)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ===================== MAIL DETAIL =====================
function MailDetail({ mail, onReply, onToggleStar, onTrash, onBack }) {
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const handleSendReply = async () => {
    if (!replyText.trim()) return
    setSending(true)
    await onReply(mail, replyText)
    setReplyText('')
    setSending(false)
  }
  if (!mail) return (
    <div className="detail-panel">
      <div className="detail-welcome">
        <div className="welcome-icon-wrap">
          <div className="welcome-icon-bg"><Mail className="welcome-icon" /></div>
        </div>
        <h2>Welcome to MailDash</h2>
        <p>Select a conversation to read, or compose a new message.</p>
      </div>
    </div>
  )
  return (
    <div className="detail-panel">
      <div className="mail-detail-view">
        <div className="detail-toolbar">
          <button className="btn btn-ghost" onClick={onBack} id="back-btn">
            <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back
          </button>
          <div className="detail-toolbar-spacer" />
          <button className="btn btn-ghost" onClick={() => onToggleStar(mail)} id="star-mail-btn"
            style={{ color: mail.is_starred ? '#f59e0b' : '' }}>
            <Star size={14} fill={mail.is_starred ? 'currentColor' : 'none'} />
            {mail.is_starred ? 'Starred' : 'Star'}
          </button>
          <button className="btn btn-danger" onClick={() => onTrash(mail)} id="trash-btn">
            <Trash2 size={14} /> Trash
          </button>
        </div>
        <div className="detail-scroll">
          <div className="mail-detail-header">
            <h1 className="detail-subject">{mail.subject}</h1>
            <div className="detail-meta-card">
              <div className="detail-avatar" style={{ background: mail.avatar_color || '#6366f1' }}>{getInitials(mail.from_name)}</div>
              <div className="detail-meta-info">
                <div className="detail-from">{mail.from_name}</div>
                <div className="detail-email">{mail.from_email}</div>
                <div className="detail-time">{formatTime(mail.timestamp)}</div>
              </div>
              <div className="to-badge">to: {mail.to || 'me'}</div>
            </div>
          </div>
          <div className="detail-body">{mail.body}</div>
        </div>
        <div className="reply-area">
          <div className="reply-box">
            <div className="reply-label">Reply to {mail.from_name}</div>
            <textarea className="reply-textarea" id="reply-textarea"
              placeholder="Write your reply…" value={replyText} onChange={e => setReplyText(e.target.value)} />
            <div className="reply-actions">
              <button className="btn btn-primary" onClick={handleSendReply} id="send-reply-btn" disabled={sending || !replyText.trim()}>
                {sending ? 'Sending…' : <><Send size={13} /> Send Reply</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===================== COMPOSE MODAL =====================
function ComposeModal({ onClose, onSend }) {
  const [form, setForm] = useState({ to: '', subject: '', body: '' })
  const [sending, setSending] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const handleSend = async () => {
    if (!form.to || !form.subject) return
    setSending(true)
    await onSend(form)
    setSending(false)
    onClose()
  }
  const handleDraft = async () => { await onSend({ ...form, folder: 'drafts' }); onClose() }
  return (
    <div className="compose-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="compose-modal">
        <div className="compose-header">
          <span className="compose-title">✍️ New Message</span>
          <button className="icon-btn" onClick={onClose} id="close-compose-btn"><X size={16} /></button>
        </div>
        <div className="compose-body">
          {[['To', 'to', 'recipient@example.com'], ['Subject', 'subject', 'Message subject…']].map(([lbl, key, ph]) => (
            <div className="form-field" key={key}>
              <label className="form-label">{lbl}</label>
              <input id={`compose-${key}`} className="form-input" placeholder={ph} value={form[key]} onChange={set(key)} />
            </div>
          ))}
          <div className="form-field">
            <label className="form-label">Message</label>
            <textarea id="compose-body" className="form-input form-textarea" placeholder="Write your message…" value={form.body} onChange={set('body')} />
          </div>
        </div>
        <div className="compose-footer">
          <button className="btn btn-ghost" onClick={handleDraft} id="save-draft-btn"><FileText size={13} /> Save Draft</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" id="send-mail-btn" onClick={handleSend} disabled={sending || !form.to || !form.subject}>
              {sending ? 'Sending…' : <><Send size={13} /> Send</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===================== TEACHER CARD =====================
const STATUS_COLORS = { active: '#10b981', on_leave: '#f59e0b', inactive: '#ef4444' }
const STATUS_LABELS = { active: 'Active', on_leave: 'On Leave', inactive: 'Inactive' }

function TeacherCard({ teacher, onSelect, onDelete }) {
  const statusColor = STATUS_COLORS[teacher.status] || '#64748b'
  return (
    <div className="teacher-card" onClick={() => onSelect(teacher)}>
      <div className="teacher-card-top">
        <div className="teacher-avatar" style={{ background: teacher.avatar_color || '#6366f1' }}>
          {getInitials(teacher.name)}
        </div>
        <div style={{ flex: 1 }}>
          <div className="teacher-name">{teacher.name}</div>
          <div className="teacher-subject">{teacher.subject}</div>
        </div>
        <div className="teacher-status-badge" style={{ background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
          {STATUS_LABELS[teacher.status] || teacher.status}
        </div>
      </div>

      <div className="teacher-dept">{teacher.department}</div>

      <div className="teacher-meta-row">
        <div className="teacher-meta-item"><Award size={12} /> {teacher.rating}★</div>
        <div className="teacher-meta-item"><Users size={12} /> {teacher.students_count} students</div>
        <div className="teacher-meta-item"><Briefcase size={12} /> {teacher.experience_years}y exp</div>
      </div>

      <div className="teacher-footer">
        <div className="teacher-email">{teacher.email}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="icon-btn" title="View" onClick={e => { e.stopPropagation(); onSelect(teacher) }}><Eye size={13} /></button>
          <button className="icon-btn danger-hover" title="Delete"
            onClick={e => { e.stopPropagation(); onDelete(teacher) }}><Trash size={13} /></button>
        </div>
      </div>
    </div>
  )
}

// ===================== TEACHER DETAIL MODAL =====================
function TeacherDetailModal({ teacher, onClose, onDelete }) {
  if (!teacher) return null
  const statusColor = STATUS_COLORS[teacher.status] || '#64748b'
  return (
    <div className="compose-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="compose-modal" style={{ width: 580, maxHeight: '88vh' }}>
        <div className="compose-header">
          <span className="compose-title">👤 Teacher Profile</span>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="compose-body" style={{ gap: 16 }}>
          {/* Top profile */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: teacher.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {getInitials(teacher.name)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{teacher.name}</div>
              <div style={{ color: 'var(--text-accent)', fontWeight: 500, marginBottom: 6 }}>{teacher.subject} · {teacher.department}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="teacher-status-badge" style={{ background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40`, padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
                  {STATUS_LABELS[teacher.status]}
                </span>
                <span style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--text-accent)', padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', border: '1px solid rgba(99,102,241,0.2)' }}>
                  {teacher.qualification}
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Rating', value: `${teacher.rating}★`, color: '#f59e0b' },
              { label: 'Students', value: teacher.students_count, color: '#10b981' },
              { label: 'Experience', value: `${teacher.experience_years}y`, color: '#6366f1' },
              { label: 'Salary', value: `₹${fmt(teacher.salary)}`, color: '#06b6d4' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Contact info */}
          <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: <Mail size={13} />, value: teacher.email },
              { icon: <Phone size={13} />, value: teacher.phone },
              { icon: <MapPin size={13} />, value: teacher.address },
              { icon: <Calendar size={13} />, value: `Joined: ${teacher.joined_date}` },
            ].map((r, i) => r.value && (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{r.icon}</span>{r.value}
              </div>
            ))}
          </div>

          {/* Bio */}
          {teacher.bio && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>About</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{teacher.bio}</div>
            </div>
          )}

          {/* Awards */}
          {teacher.awards?.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>🏆 Awards</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {teacher.awards.map((a, i) => (
                  <span key={i} style={{ padding: '4px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', borderRadius: 999, fontSize: '0.75rem' }}>
                    🏅 {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Classes */}
          {teacher.classes?.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Classes Taught</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {teacher.classes.map((c, i) => (
                  <span key={i} style={{ padding: '4px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--text-accent)', borderRadius: 999, fontSize: '0.75rem' }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="compose-footer">
          <button className="btn btn-danger" onClick={() => { onDelete(teacher); onClose() }}><Trash size={13} /> Delete Teacher</button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ===================== ADD TEACHER MODAL =====================
function AddTeacherModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', subject: '', department: '',
    qualification: '', experience_years: '', salary: '', status: 'active',
    gender: '', address: '', bio: '', avatar_color: '#6366f1'
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6']

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.subject) return
    setSaving(true)
    await onAdd(form)
    setSaving(false)
    onClose()
  }

  return (
    <div className="compose-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="compose-modal" style={{ width: 560, maxHeight: '90vh' }}>
        <div className="compose-header">
          <span className="compose-title">➕ Add New Teacher</span>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="compose-body">
          {/* Avatar color picker */}
          <div className="form-field">
            <label className="form-label">Avatar Color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: form.avatar_color === c ? '3px solid white' : '3px solid transparent', transition: 'all 0.15s' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['Name *', 'name', 'Dr. John Smith'], ['Email *', 'email', 'john@school.edu'],
              ['Phone', 'phone', '+91-98765-43210'], ['Subject *', 'subject', 'Mathematics'],
              ['Department', 'department', 'Science & Mathematics'], ['Qualification', 'qualification', 'Ph.D. Mathematics'],
              ['Experience (years)', 'experience_years', '5'], ['Salary (₹)', 'salary', '70000'],
              ['Gender', 'gender', 'Male/Female'], ['Address', 'address', 'City, State'],
            ].map(([lbl, key, ph]) => (
              <div className="form-field" key={key}>
                <label className="form-label">{lbl}</label>
                <input className="form-input" placeholder={ph} value={form[key]} onChange={set(key)} />
              </div>
            ))}
          </div>
          <div className="form-field">
            <label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={set('status')} style={{ cursor: 'pointer' }}>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Bio</label>
            <textarea className="form-input" style={{ minHeight: 80, resize: 'none' }} placeholder="Short bio about the teacher…" value={form.bio} onChange={set('bio')} />
          </div>
        </div>
        <div className="compose-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving || !form.name || !form.email || !form.subject}>
            {saving ? 'Saving…' : <><GraduationCap size={13} /> Add Teacher</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===================== TEACHERS VIEW =====================
function TeachersView({ onAddToast }) {
  const [teachers, setTeachers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, s] = await Promise.all([getTeachers({ search, status: statusFilter }), getTeacherStats()])
      setTeachers(t)
      setStats(s)
    } catch { onAddToast('Failed to load teachers', 'error') }
    finally { setLoading(false) }
  }, [search, statusFilter])

  useEffect(() => { load() }, [search, statusFilter])

  const handleDelete = async (teacher) => {
    if (!window.confirm(`Delete ${teacher.name}?`)) return
    try {
      await deleteTeacher(teacher._id)
      onAddToast(`${teacher.name} deleted`, 'info')
      load()
    } catch { onAddToast('Failed to delete', 'error') }
  }

  const handleAdd = async (data) => {
    try {
      await createTeacher(data)
      onAddToast('Teacher added!', 'success')
      load()
    } catch { onAddToast('Failed to add teacher', 'error') }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div className="teachers-header">
        <div>
          <h1 className="teachers-title">👨‍🏫 Teacher Dashboard</h1>
          <p className="teachers-subtitle">MongoDB Atlas · maildashboard.teachers</p>
        </div>
        <button className="compose-btn" style={{ margin: 0, width: 'auto' }} onClick={() => setShowAddModal(true)} id="add-teacher-btn">
          <Plus size={15} /> Add Teacher
        </button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="teacher-stats-row">
          {[
            { label: 'Total Teachers', value: stats.total, icon: <GraduationCap size={16} />, color: '#6366f1' },
            { label: 'Active', value: stats.active, icon: <CheckCircle size={16} />, color: '#10b981' },
            { label: 'On Leave', value: stats.on_leave, icon: <Calendar size={16} />, color: '#f59e0b' },
            { label: 'Total Students', value: fmt(stats.total_students), icon: <Users size={16} />, color: '#06b6d4' },
            { label: 'Avg Rating', value: `${stats.avg_rating}★`, icon: <Award size={16} />, color: '#f59e0b' },
            { label: 'Avg Salary', value: `₹${fmt(Math.round(stats.avg_salary))}`, icon: <TrendingUp size={16} />, color: '#8b5cf6' },
          ].map(s => (
            <div className="teacher-stat-card" key={s.label}>
              <div style={{ color: s.color, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div className="teacher-filter-bar">
        <div className="search-box" style={{ flex: 1, maxWidth: 320 }}>
          <Search className="search-icon" />
          <input id="teacher-search" type="text" placeholder="Search teachers…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          {['', 'active', 'on_leave', 'inactive'].map(s => (
            <button key={s} className={`btn btn-ghost ${statusFilter === s ? 'active-filter' : ''}`}
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
              onClick={() => setStatusFilter(s)}>
              {s === '' ? 'All' : STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>
        <button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="loading-wrap"><div className="spinner" /><span className="loading-text">Loading teachers…</span></div>
      ) : teachers.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">👨‍🏫</div><h3>No teachers found</h3><p>Try a different filter or search.</p></div>
      ) : (
        <div className="teacher-grid">
          {teachers.map(t => (
            <TeacherCard key={t._id} teacher={t} onSelect={setSelectedTeacher} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {selectedTeacher && <TeacherDetailModal teacher={selectedTeacher} onClose={() => setSelectedTeacher(null)} onDelete={handleDelete} />}
      {showAddModal && <AddTeacherModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />}
    </div>
  )
}

// ===================== DB EXPLORER VIEW =====================
function DbExplorerView({ onAddToast }) {
  const [dbs, setDbs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    setLoading(true)
    getDbExplorer()
      .then(data => { setDbs(data); setLoading(false) })
      .catch(() => { onAddToast('Failed to load databases', 'error'); setLoading(false) })
  }, [])

  const toggle = (name) => setExpanded(e => ({ ...e, [name]: !e[name] }))
  const totalDocs = dbs.reduce((s, d) => s + d.total_docs, 0)
  const totalCols = dbs.reduce((s, d) => s + d.collection_count, 0)

  const DB_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6', '#ef4444', '#84cc16']

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="teachers-header">
        <div>
          <h1 className="teachers-title">🗄️ DB Explorer</h1>
          <p className="teachers-subtitle">MongoDB Atlas · cluster0.41hrxqq · All Databases</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="stat-chip">
            <span className="stat-num">{dbs.length}</span>
            <span className="stat-label">Databases</span>
          </div>
          <div className="stat-chip">
            <span className="stat-num">{totalCols}</span>
            <span className="stat-label">Collections</span>
          </div>
          <div className="stat-chip">
            <span className="stat-num">{fmt(totalDocs)}</span>
            <span className="stat-label">Documents</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /><span className="loading-text">Exploring Atlas cluster…</span></div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dbs.map((db, idx) => (
            <div key={db.database} className="db-card">
              <div className="db-card-header" onClick={() => toggle(db.database)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: DB_COLORS[idx % DB_COLORS.length], flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{db.database}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      {db.collection_count} collection{db.collection_count !== 1 ? 's' : ''} · {fmt(db.total_docs)} documents
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {db.collections.slice(0, 4).map(c => (
                      <span key={c.name} style={{ fontSize: '0.68rem', padding: '2px 8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 999, color: 'var(--text-accent)' }}>
                        {c.name}
                      </span>
                    ))}
                    {db.collections.length > 4 && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>+{db.collections.length - 4}</span>}
                  </div>
                  {expanded[db.database] ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                </div>
              </div>

              {expanded[db.database] && (
                <div className="db-collections">
                  {db.collections.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '8px 16px' }}>No collections</div>
                  ) : db.collections.map((col, ci) => (
                    <div key={col.name} className="db-collection-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Layers size={12} style={{ color: DB_COLORS[idx % DB_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{col.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, (col.count / (Math.max(...db.collections.map(c => c.count)) || 1)) * 100)}%`, background: DB_COLORS[idx % DB_COLORS.length], borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: 60, textAlign: 'right' }}>{fmt(col.count)} docs</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===================== MAIN APP =====================
export default function App() {
  const [view, setView] = useState('mail')       // 'mail' | 'teachers' | 'dbexplorer'
  const [folder, setFolder] = useState('inbox')
  const [mails, setMails] = useState([])
  const [selectedMail, setSelectedMail] = useState(null)
  const [loadingMails, setLoadingMails] = useState(false)
  const [mailStats, setMailStats] = useState(null)
  const [teacherStats, setTeacherStats] = useState(null)
  const [composing, setComposing] = useState(false)
  const { toasts, addToast, removeToast } = useToasts()

  const loadMails = useCallback(async (f = folder) => {
    setLoadingMails(true)
    try {
      const isStarred = f === 'starred'
      const data = await getMails(isStarred ? 'inbox' : f, isStarred)
      setMails(data)
    } catch { addToast('Failed to load mails. Is Django running on :8000?', 'error') }
    finally { setLoadingMails(false) }
  }, [folder])

  const loadStats = useCallback(async () => {
    try {
      const [ms, ts] = await Promise.all([getMailStats(), getTeacherStats()])
      setMailStats(ms)
      setTeacherStats(ts)
    } catch {}
  }, [])

  useEffect(() => {
    if (view === 'mail') loadMails(folder)
  }, [folder, view])

  useEffect(() => { loadStats() }, [])

  const handleSelectMail = async (mail) => {
    setSelectedMail(mail)
    if (!mail.is_read) {
      try {
        await updateMail(mail._id, { is_read: true })
        setMails(prev => prev.map(m => m._id === mail._id ? { ...m, is_read: true } : m))
        loadStats()
      } catch {}
    }
  }

  const handleToggleStar = async (mail) => {
    const newVal = !mail.is_starred
    setMails(prev => prev.map(m => m._id === mail._id ? { ...m, is_starred: newVal } : m))
    if (selectedMail?._id === mail._id) setSelectedMail(m => ({ ...m, is_starred: newVal }))
    try { await updateMail(mail._id, { is_starred: newVal }); loadStats() }
    catch { setMails(prev => prev.map(m => m._id === mail._id ? { ...m, is_starred: !newVal } : m)) }
  }

  const handleTrash = async (mail) => {
    setMails(prev => prev.filter(m => m._id !== mail._id))
    setSelectedMail(null)
    try { await updateMail(mail._id, { is_trash: true, folder: 'trash' }); addToast('Moved to Trash', 'info'); loadStats() }
    catch { addToast('Failed to trash mail', 'error') }
  }

  const handleSendMail = async (formData) => {
    try {
      const isDraft = formData.folder === 'drafts'
      await createMail({ ...formData, from_email: 'me@maildash.com', from_name: 'Me', folder: formData.folder || 'sent', avatar_color: '#6366f1' })
      addToast(isDraft ? 'Draft saved!' : 'Mail sent! 🚀', 'success')
      if (folder === 'sent' || folder === 'drafts') loadMails(folder)
      loadStats()
    } catch { addToast('Failed to send mail', 'error') }
  }

  const handleReply = async (mail, replyText) => {
    await handleSendMail({ to: mail.from_email, subject: `Re: ${mail.subject}`, body: replyText, folder: 'sent' })
  }

  return (
    <div className="app-layout">
      <Sidebar
        view={view}
        activeFolder={folder}
        onFolderChange={(f) => { setFolder(f); setSelectedMail(null) }}
        onViewChange={(v) => { setView(v); setSelectedMail(null) }}
        onCompose={() => setComposing(true)}
        mailStats={mailStats}
        teacherStats={teacherStats}
      />

      {view === 'mail' && (
        <>
          <MailListPanel
            folder={folder} mails={mails} loading={loadingMails}
            selectedId={selectedMail?._id} onSelect={handleSelectMail}
            onRefresh={() => { loadMails(folder); loadStats() }}
            onToggleStar={handleToggleStar}
          />
          <MailDetail
            mail={selectedMail} onReply={handleReply}
            onToggleStar={handleToggleStar} onTrash={handleTrash}
            onBack={() => setSelectedMail(null)}
          />
        </>
      )}

      {view === 'teachers' && <TeachersView onAddToast={addToast} />}
      {view === 'dbexplorer' && <DbExplorerView onAddToast={addToast} />}

      {composing && <ComposeModal onClose={() => setComposing(false)} onSend={handleSendMail} />}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

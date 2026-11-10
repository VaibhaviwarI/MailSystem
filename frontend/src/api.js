import axios from 'axios'

const API = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Mails ──────────────────────────────────────
export const getMails = (folder, starred = false) =>
  API.get('/mails/', { params: { folder, starred } }).then(r => r.data)

export const getMailStats = () =>
  API.get('/mails/stats/').then(r => r.data)

export const getMail = (id) =>
  API.get(`/mails/${id}/`).then(r => r.data)

export const createMail = (data) =>
  API.post('/mails/', data).then(r => r.data)

export const updateMail = (id, data) =>
  API.patch(`/mails/${id}/`, data).then(r => r.data)

export const deleteMail = (id) =>
  API.delete(`/mails/${id}/`)

// ── Teachers ───────────────────────────────────
export const getTeachers = (params = {}) =>
  API.get('/teachers/', { params }).then(r => r.data)

export const getTeacherStats = () =>
  API.get('/teachers/stats/').then(r => r.data)

export const getTeacher = (id) =>
  API.get(`/teachers/${id}/`).then(r => r.data)

export const createTeacher = (data) =>
  API.post('/teachers/', data).then(r => r.data)

export const updateTeacher = (id, data) =>
  API.patch(`/teachers/${id}/`, data).then(r => r.data)

export const deleteTeacher = (id) =>
  API.delete(`/teachers/${id}/`)

// ── DB Explorer ────────────────────────────────
export const getDbExplorer = () =>
  API.get('/db-explorer/').then(r => r.data)

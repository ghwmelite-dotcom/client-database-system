import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verify: () => api.get('/auth/verify'),
}

export const clientsAPI = {
  create: (clientData) => api.post('/clients', clientData),
  getAll: (params) => api.get('/clients', { params }),
  getById: (id) => api.get(`/clients/${id}`),
  update: (id, clientData) => api.put(`/clients/${id}`, clientData),
  delete: (id) => api.delete(`/clients/${id}`),
  exportCSV: (params) => api.get('/clients/export/csv', { params, responseType: 'blob' }),
  importCSV: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/clients/import/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const notesAPI = {
  create: (clientId, noteData) => api.post(`/clients/${clientId}/notes`, noteData),
  getByClient: (clientId, params) => api.get(`/clients/${clientId}/notes`, { params }),
  delete: (noteId) => api.delete(`/notes/${noteId}`),
}

export default api
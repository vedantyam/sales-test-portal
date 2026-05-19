import axios from 'axios'
import { useAuthStore, parseJWT } from '../store/authStore'

const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/api/v1'

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        )
        const newToken: string = res.data.access_token
        const payload = parseJWT(newToken)
        const currentUser = useAuthStore.getState().user

        useAuthStore.getState().setAuth(newToken, currentUser || {
          id: payload.sub as string,
          name: (payload.name as string) || '',
          department: payload.department as string | undefined,
          email: payload.email as string | undefined,
          role: payload.role as 'admin' | 'employee',
        })

        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        useAuthStore.getState().clearAuth()
        if (typeof window !== 'undefined') {
          const isAdmin = window.location.pathname.startsWith('/admin')
          window.location.href = isAdmin ? '/admin/login' : '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

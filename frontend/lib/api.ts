import axios from 'axios'
import { useAuthStore, parseJWT } from '../store/authStore'

const instance = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

instance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

instance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        const newToken: string = res.data.access_token
        const currentUser = useAuthStore.getState().user
        const payload = parseJWT(newToken)
        useAuthStore.getState().setAuth(newToken, currentUser ?? {
          id: payload.sub as string,
          name: (payload.name as string) || '',
          department: payload.department as string | undefined,
          email: payload.email as string | undefined,
          role: payload.role as 'admin' | 'employee',
        })
        original.headers.Authorization = `Bearer ${newToken}`
        return instance(original)
      } catch {
        useAuthStore.getState().clearAuth()
        if (typeof window !== 'undefined') {
          const role = useAuthStore.getState().user?.role
          window.location.href = role === 'admin' ? '/admin/login' : '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export const api = instance
export const adminApi = instance
export const employeeApi = instance

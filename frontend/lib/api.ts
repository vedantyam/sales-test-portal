import axios from 'axios'
import { useAuthStore, parseJWT } from '../store/authStore'

const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/api/v1'

function createApiInstance(loginPath: string) {
  const instance = axios.create({
    baseURL: BASE,
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
          const res = await axios.post(
            BASE + '/auth/refresh',
            {},
            { withCredentials: true }
          )
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
            window.location.href = loginPath
          }
        }
      }
      return Promise.reject(error)
    }
  )

  return instance
}

export const employeeApi = createApiInstance('/login')
export const adminApi = createApiInstance('/admin/login')
// backward compat — employee pages that haven't been updated yet still work
export const api = employeeApi

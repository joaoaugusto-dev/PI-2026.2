import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api, setAuthToken } from '@/lib/api'

interface Usuario {
  id: number
  nome: string
  email: string
  papel: string
}

interface AuthContextValue {
  usuario: Usuario | null
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  const login = async (email: string, senha: string) => {
    const { data } = await api.post('/auth/login', { email, senha })
    setAuthToken(data.data.token)
    setUsuario(data.data.usuario)
  }

  const logout = () => {
    setAuthToken(null)
    setUsuario(null)
  }

  const value = useMemo(() => ({ usuario, login, logout }), [usuario])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const location = useLocation()

  if (!usuario) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

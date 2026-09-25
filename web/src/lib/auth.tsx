import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api, setAuthToken, setHandler401 } from '@/lib/api'

interface Usuario {
  id: number
  nome: string
  matricula: string
  papel: string
}

interface AuthContextValue {
  usuario: Usuario | null
  login: (matricula: string, senha: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// v2: sessões antigas (pré-#150) guardavam um `usuario` com `email` em vez de
// `matricula`. Trocar a chave descarta essas sessões e força novo login em
// vez de restaurar um usuário desatualizado.
const CHAVE_SESSAO = 'soufer:sessao:v2'

interface SessaoPersistida {
  token: string
  usuario: Usuario
}

// Decodifica só o payload do JWT (base64url) pra ler o `exp` — não precisa
// validar assinatura aqui, quem valida de verdade é a API a cada requisição;
// isso só evita restaurar uma sessão que a gente já sabe que vai ser
// rejeitada.
function expiracaoDoToken(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(base64))
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

function lerSessaoPersistida(): SessaoPersistida | null {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO)
    if (!bruto) return null
    const sessao = JSON.parse(bruto) as SessaoPersistida
    const expiraEm = expiracaoDoToken(sessao.token)
    if (!expiraEm || expiraEm <= Date.now()) {
      localStorage.removeItem(CHAVE_SESSAO)
      return null
    }
    return sessao
  } catch {
    localStorage.removeItem(CHAVE_SESSAO)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const sessao = lerSessaoPersistida()
    if (sessao) setAuthToken(sessao.token)
    return sessao?.usuario ?? null
  })

  const logout = () => {
    setAuthToken(null)
    setUsuario(null)
    localStorage.removeItem(CHAVE_SESSAO)
  }

  useEffect(() => {
    setHandler401(logout)
    return () => setHandler401(null)
  }, [])

  const login = async (matricula: string, senha: string) => {
    const { data } = await api.post('/auth/login', { matricula, senha })
    const { token, usuario: usuarioLogado } = data.data
    setAuthToken(token)
    setUsuario(usuarioLogado)
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ token, usuario: usuarioLogado }))
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

// Aprovação de cadastros (issue #149) é exclusiva do papel `admin` — a API já
// barra com 403, isso só evita mostrar a tela pra quem não pode usá-la.
export function RotaAdmin({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()

  if (usuario?.papel !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

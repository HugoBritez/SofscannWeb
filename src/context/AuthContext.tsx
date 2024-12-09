// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react'
import { API_URL } from '../config/config'

interface Usuario {
  op_codigo: number
  op_usuario: string
  op_nombre: string
  op_documento: string
  op_dir: string
  op_tel: string
}

export interface AuthContextType {
  isAuthenticated: boolean
  signIn: (usuario: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  token: string | null
  usuario: Usuario | null
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  signIn: async () => {},
  signOut: async () => {},
  token: null,
  usuario: null
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  useEffect(() => {
    const loadToken = async () => {
      try {
        const savedToken = localStorage.getItem('userToken')
        const savedUser = localStorage.getItem('usuario')
        if (savedToken && savedUser) {
          setToken(savedToken)
          setUsuario(JSON.parse(savedUser))
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error('Error al cargar el token:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadToken()
  }, [])

  const signIn = async (usuario: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/usuarios/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          user: usuario,    
          pass: password    
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error en la autenticación')
      }

      const data = await response.json()
      
      if (data.body && data.body.token && Array.isArray(data.body.usuario) && data.body.usuario.length > 0) {
        const userData = data.body.usuario[0]  // Tomamos el primer elemento del array
        const jwtToken = data.body.token

        // Guardamos en localStorage
        localStorage.setItem('userToken', jwtToken)
        localStorage.setItem('usuario', JSON.stringify(userData))

        // Actualizamos el estado
        setToken(jwtToken)
        setUsuario(userData)
        setIsAuthenticated(true)
      } else {
        throw new Error('Formato de respuesta inválido')
      }
    } catch (error: any) {
      console.error('Error en autenticación:', error)
      throw new Error(error.message || 'Error al iniciar sesión')
    }
  }

  const signOut = async () => {
    try {
      localStorage.removeItem('userToken')
      localStorage.removeItem('usuario')
      setIsAuthenticated(false)
      setToken(null)
      setUsuario(null)
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  if (isLoading) {
    return null // o un componente de loading
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      signIn, 
      signOut, 
      token, 
      usuario 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}

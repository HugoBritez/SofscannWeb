import { API_URL } from '../config/config'

interface AuditoriaData {
  entidad: number
  accion: number
  fecha: Date
  usuario: string | null
  idReferencia: number | null
  vendedor: number
  obs: string
}

export async function auditar(
  entidad: number, 
  accion: number, 
  idReferencia: number | null, 
  vendedor: number, 
  obs: string
) {
  const token = localStorage.getItem('userToken')
  const usuario = localStorage.getItem('user_name')
  
  const datos: AuditoriaData = {
    entidad,
    accion,
    fecha: new Date(),
    usuario,
    idReferencia,
    vendedor,
    obs,
  }
  
  try {
    const response = await fetch(`${API_URL}/auditoria`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(datos)
    })

    if (!response.ok) {
      throw new Error('Error al registrar auditoría')
    }
  } catch (error) {
    console.error('Error en auditoría:', error)
  }
} 
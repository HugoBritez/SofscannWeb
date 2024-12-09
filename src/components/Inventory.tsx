import  { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config/config'
import { Menu, Grid, List, LogOut } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface Articulo {
  ar_codigo: number
  ar_codbarra: string
  ar_descripcion: string
  ar_pvg: number
  al_cantidad: number
  al_codigo: number
  al_vencimiento: string
}

interface Deposito {
  dep_codigo: number
  dep_descripcion: string
}

interface Sucursal {
  id: number
  descripcion: string
}

const formatNumber = (num: number): string => {
  const roundedNum = Math.round(num);
  return roundedNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const Inventory = () => {
  const { token, signOut } = useAuth()
  const [isGridView, setIsGridView] = useState(true)
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [depositoId, setDepositoId] = useState('1')
  const [articuloBusqueda, setArticuloBusqueda] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [depositos, setDepositos] = useState<Deposito[]>([])
  const [sucursal, setSucursal] = useState<Sucursal | null>(null)
  const [deposito, setDeposito] = useState<Deposito | null>(null)
  const [existenciaActual, setExistenciaActual] = useState(0)
  const [existenciaFisica, setExistenciaFisica] = useState(0)
  const [vencimiento, setVencimiento] = useState('')
  const [lote, setLote] = useState('')
  const [codigoBarra, setCodigoBarra] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [fecha] = useState(new Date().toISOString().split('T')[0])
  const [ultimoNroInventario, setUltimoNroInventario] = useState(1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [inputActive, setInputActive] = useState(false)

  const handleEditarArticulo = (articulo: Articulo) => {
    setArticuloSeleccionado(articulo)
    setExistenciaActual(articulo.al_cantidad)
    setExistenciaFisica(articulo.al_cantidad)
    setVencimiento(articulo.al_vencimiento || '')
    setLote(articulo.al_codigo.toString())
    setCodigoBarra(articulo.ar_codbarra)
    setModalVisible(true)
  }

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!inputActive) {
      e.preventDefault();
      setInputActive(true);
      setTimeout(() => setInputActive(false), 300);
    }
  };

  useEffect(() => {
    const fetchSucursalesYDepositos = async () => {
      try {
        const [sucursalesRes, depositosRes] = await Promise.all([
          fetch(`${API_URL}/sucursales/listar`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_URL}/depositos/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ])

        const sucursalesData = await sucursalesRes.json()
        const depositosData = await depositosRes.json()

        setSucursales(sucursalesData.body || [])
        setDepositos(depositosData.body || [])
      } catch (error) {
        console.error('Error al cargar datos:', error)
      }
    }

    fetchSucursalesYDepositos()
  }, [token])

  useEffect(() => {
    const traerIdUltimoInventario = async () => {
      try {
        const response = await fetch(`${API_URL}/articulos/ultimo-nro-inventario`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.body && data.body.length > 0) {
          setUltimoNroInventario(data.body[0].nro_inventario + 1);
        }
      } catch (error) {
        console.error('Error al obtener último número de inventario:', error);
      }
    };

    traerIdUltimoInventario();
  }, [token]);

  const buscarArticuloPorCodigo = async (codigo: string) => {
    if (codigo.length === 0) {
      setArticulos([])
      return
    }

    try {
      const queryParams = new URLSearchParams({
        buscar: codigo,
        id_deposito: depositoId
      })

      const response = await fetch(`${API_URL}/articulos?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor')
      }

      const data = await response.json()
      
      if (!data || !Array.isArray(data.body)) {
        throw new Error('Respuesta del servidor en formato incorrecto')
      }

      setArticulos(data.body)
      
    } catch (error) {
      console.error('Error al buscar artículos:', error)
      toast.error('Error al buscar artículos')
      setArticulos([])
    }
  }

  const handleBusqueda = (texto: string) => {
    setArticuloBusqueda(texto)
    buscarArticuloPorCodigo(texto)
  }

  const cargarInventario = async () => {
    try {
      if (!articuloSeleccionado) {
        toast.error("No hay artículos para cargar")
        return
      }

      if (!vencimiento) {
        toast.error("Debe seleccionar una fecha de vencimiento")
        return
      }

      const inventarioData = {
        inventario: {
          fecha,
          hora: new Date().toLocaleTimeString().slice(0, 5),
          operador: 1,
          sucursal: sucursal?.id || 1,
          deposito: depositoId,
          tipo: 1,
          estado: 1,
          in_obs: observaciones || "",
          nro_inventario: ultimoNroInventario,
        },
        inventario_items: [{
          idArticulo: articuloSeleccionado.ar_codigo,
          cantidad: Number(existenciaFisica),
          costo: 0,
          stock_actual: Number(existenciaActual),
          stock_dif: Number(existenciaFisica) - Number(existenciaActual),
          codbarra: codigoBarra || "",
          vencimientos: [
            {
              lote: lote || "SIN LOTE",
              fecha_vence: vencimiento,
              loteid: lote || 0,
            },
          ],
        }],
      }

      const response = await fetch(`${API_URL}/articulos/agregar-inventario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inventarioData)
      })

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor')
      }

      setModalVisible(false)
      toast.success("El inventario se cargó satisfactoriamente")
      setArticuloBusqueda('')
      setArticulos([])
      searchInputRef.current?.focus()
    } catch (error) {
      console.error(error)
      toast.error("Error al cargar el inventario")
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Toaster 
        position="bottom-center"
        toastOptions={{
          className: '',
          duration: 3000,
          style: {
            background: '#fff',
            color: '#363636',
            padding: '16px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            fontSize: '14px',
            maxWidth: '500px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #10B981',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #EF4444',
            },
          },
        }}
      />
      
      {/* Header Fijo */}
      <div className="bg-[#0455c1] rounded-b-3xl pb-4 sticky top-0 z-10">
        <div className="flex justify-between items-center px-4 pt-2 pb-4">
          <h1 className="text-white text-xl font-bold">Toma de Inventario</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsGridView(!isGridView)}
              className="bg-white/20 p-2 rounded"
            >
              {isGridView ? <Grid size={20} color="white" /> : <List size={20} color="white" />}
            </button>
            <button 
              className="bg-white/20 p-2 rounded"
              onClick={() => setIsDrawerOpen(true)}
            >
              <Menu size={20} color="white" />
            </button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="px-4">
          <div className="flex items-center bg-white rounded-lg">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar producto"
              className="flex-1 p-3 rounded-lg"
              value={articuloBusqueda}
              onChange={(e) => handleBusqueda(e.target.value)}
              onClick={handleInputClick}
              readOnly={!inputActive}
            />
          </div>
        </div>
      </div>

      {/* Lista de artículos con scroll */}
      <div className="flex-1 overflow-auto p-4" style={{ height: 'calc(100vh - 180px)' }}>
        <motion.div 
          className={`grid ${isGridView ? 'grid-cols-2' : 'grid-cols-1'} gap-4 auto-rows-max`}
          layout
        >
          {articulos.map((item) => (
            <motion.div
              key={item.al_codigo}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleEditarArticulo(item)}
              className="bg-white p-4 rounded-lg shadow cursor-pointer"
            >
              <p className="text-xs text-gray-500">{item.ar_codbarra}</p>
              <p className="font-bold my-1">{item.ar_descripcion}</p>
              <p className="text-[#0455c1] font-medium">Gs. {formatNumber(item.ar_pvg)}</p>
              <p className="text-sm text-gray-500 mt-1">Stock: {item.al_cantidad}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Drawer con animación */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
            />
            <motion.div 
              className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-50"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4">
                <h2 className="text-xl font-bold mb-6">Ajustes</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sucursal
                    </label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={sucursal?.id || ''}
                      onChange={(e) => {
                        const selected = sucursales.find(s => s.id === Number(e.target.value))
                        setSucursal(selected || null)
                      }}
                    >
                      {sucursales.map(suc => (
                        <option key={suc.id} value={suc.id}>
                          {suc.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Depósito
                    </label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={deposito?.dep_codigo || ''}
                      onChange={(e) => {
                        const selected = depositos.find(d => d.dep_codigo === Number(e.target.value))
                        setDeposito(selected || null)
                        if (selected) setDepositoId(String(selected.dep_codigo))
                      }}
                    >
                      {depositos.map(dep => (
                        <option key={dep.dep_codigo} value={dep.dep_codigo}>
                          {dep.dep_descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => {
                    signOut()
                    setIsDrawerOpen(false)
                  }}
                  className="flex items-center gap-2 mt-auto absolute bottom-4 left-4 text-gray-600 hover:text-gray-900 justify-center"
                >
                  <LogOut size={20} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de Edición */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Editar artículo</h2>
                <button onClick={() => setModalVisible(false)} className="text-gray-500">
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-500">Inventario nro: {ultimoNroInventario}</p>
                <p className="font-bold">{articuloSeleccionado?.ar_codigo}</p>
                <p className="text-lg">{articuloSeleccionado?.ar_descripcion}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exist. Actual
                  </label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded"
                    value={existenciaActual}
                    onChange={(e) => setExistenciaActual(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exist. Física
                  </label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded"
                    value={existenciaFisica}
                    onChange={(e) => setExistenciaFisica(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Vencimiento
                </label>
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={vencimiento}
                  onChange={(e) => setVencimiento(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lote
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={lote}
                    onChange={(e) => setLote(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código de barras
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={codigoBarra}
                    onChange={(e) => setCodigoBarra(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  className="w-full p-2 border rounded"
                  rows={4}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>

              <button
                onClick={cargarInventario}
                className="w-full bg-green-600 text-white p-3 rounded-lg font-bold hover:bg-green-600"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory 
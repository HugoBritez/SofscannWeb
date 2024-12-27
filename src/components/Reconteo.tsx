import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config/config";
import {
  Menu,
  Grid,
  List,
  LogOut,
  ScanIcon,
  ClipboardCheck,
  ChartColumn,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { auditar } from "../utils/auditoria";
import { useNavigate } from "react-router-dom";

interface Articulo {
  ar_codigo: number;
  ar_codbarra: string;
  ar_descripcion: string;
  ar_pvg: number;
  al_cantidad: number;
  al_codigo: number;
  al_vencimiento: string;
  ar_ubicacicion: number;
  ar_sububicacion: number;
  al_lote: string;
}

interface Deposito {
  dep_codigo: number;
  dep_descripcion: string;
  dep_principal: number;
  dep_inventario: number;
}

interface Sucursal {
  id: number;
  descripcion: string;
}

interface Ubicaciones {
  ub_codigo: number;
  ub_descripcion: string;
}

interface Sububicaciones {
  s_codigo: number;
  s_descripcion: string;
}



const formatNumber = (num: number): string => {
  const roundedNum = Math.round(num);
  return roundedNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const Reconteo = () => {
  const navigate = useNavigate();
  const { token, signOut } = useAuth();
  const [isGridView, setIsGridView] = useState(true);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [depositoId, setDepositoId] = useState("");
  const [articuloBusqueda, setArticuloBusqueda] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [articuloSeleccionado, setArticuloSeleccionado] =
    useState<Articulo | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [sucursal, setSucursal] = useState<Sucursal | null>(null);
  const [deposito, setDeposito] = useState<Deposito | null>(null);
  const [existenciaActual, setExistenciaActual] = useState<string>("");
  const [existenciaFisica, setExistenciaFisica] = useState<string>("");
  const [vencimiento, setVencimiento] = useState("");
  const [lote, setLote] = useState("");
  const [codigoBarra, setCodigoBarra] = useState("");
  const [ultimoNroInventario, setUltimoNroInventario] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [, setUbicaciones] = useState<Ubicaciones[]>([]);
  const [ubicacion, setUbicacion] = useState<number | null>(null);
  const [sububicacion, setSububicacion] = useState<number | null>(null);
  const [, setSububicaciones] = useState<Sububicaciones[]>([]);
  const [prevVencimiento, setPrevVencimiento] = useState("");
  const [prevLote, setPrevLote] = useState("");


  // Función para manejar el cambio de vencimiento
  const handleVencimientoChange = (nuevoVencimiento: string) => {
    setPrevVencimiento(vencimiento);
    setVencimiento(formatearVencimiento(nuevoVencimiento));
  };

  // Función para manejar el cambio de lote
  const handleLoteChange = (nuevoLote: string) => {
    setPrevLote(lote);
    setLote(nuevoLote);
  };

  const handleEditarArticulo = (articulo: Articulo) => {
    setArticuloSeleccionado(articulo);

    console.log(articulo);

    const articuloVencimiento =
      formatearVencimiento(articulo.al_vencimiento) || "";
    const articuloLote = articulo.al_lote || "";

    setExistenciaActual(articulo.al_cantidad.toString());
    setExistenciaFisica(articulo.al_cantidad.toString());

    setVencimiento(articuloVencimiento);
    setPrevVencimiento(articuloVencimiento);
    setLote(articuloLote);
    setPrevLote(articuloLote);

    setCodigoBarra(articulo.ar_codbarra);
    setModalVisible(true);
    setUbicacion(articulo.ar_ubicacicion);
    setSububicacion(articulo.ar_sububicacion);
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
    searchInputRef.current?.focus();
  };

  useEffect(() => {
    const fetchSucursalesYDepositos = async () => {
      try {
        const [sucursalesRes, depositosRes] = await Promise.all([
          fetch(`${API_URL}/sucursales/listar`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/depositos/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const sucursalesData = await sucursalesRes.json();
        const depositosData = await depositosRes.json();

        console.log(sucursalesData, depositosData);
        setSucursales(sucursalesData.body || []);
        setDepositos(depositosData.body || []);

        const defaultDeposito = depositosData.body.find(
          (deposito: any) => deposito.dep_inventario === 1
        );
        if (defaultDeposito) {
          setDeposito(defaultDeposito);
          setDepositoId(String(defaultDeposito.dep_codigo));
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    };


    fetchSucursalesYDepositos();
  }, []);

  useEffect(() => {
    const traerIdUltimoInventario = async () => {
      try {
        const response = await fetch(
          `${API_URL}/articulos/ultimo-nro-inventario`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await response.json();
        if (data.body && data.body.length > 0) {
          setUltimoNroInventario(data.body[0].nro_inventario);
          console.log(data.body[0].nro_inventario);
        }
      } catch (error) {
        console.error("Error al obtener último número de inventario:", error);
      }
    };

    traerIdUltimoInventario();
  }, [token]);

  const buscarArticuloPorCodigo = async (codigo: string) => {
    if (codigo.length === 0) {
      setArticulos([]);
      return;
    }

    try {
      const codigoLimpio = codigo.startsWith("0")
        ? codigo.substring(1)
        : codigo;

      const queryParams = new URLSearchParams({
        buscar: codigoLimpio,
        id_deposito: depositoId,
      });

      const response = await fetch(`${API_URL}/articulos?${queryParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.body)) {
        if (codigo !== codigoLimpio) {
          const queryParamsOriginal = new URLSearchParams({
            buscar: codigo,
            id_deposito: depositoId,
          });

          const responseOriginal = await fetch(
            `${API_URL}/articulos?${queryParamsOriginal}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            }
          );

          const dataOriginal = await responseOriginal.json();
          if (dataOriginal && Array.isArray(dataOriginal.body)) {
            setArticulos(dataOriginal.body);
            return;
          }
        }
        throw new Error("Respuesta del servidor en formato incorrecto");
      }

      setArticulos(data.body);
      console.log(data.body);
    } catch (error) {
      console.error("Error al buscar artículos:", error);
      toast.error("Error al buscar artículos");
      setArticulos([]);
    }
  };

  const handleBusqueda = (texto: string) => {
    setArticuloBusqueda(texto);
    buscarArticuloPorCodigo(texto);
  };

  const formatearVencimiento = (vencimiento: string) => {
    const date = new Date(vencimiento);
    const anio = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, "0"); // Meses van de 0 a 11
    const dia = String(date.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
  };

  const fetchUbicaciones = async () => {
    try {
      const response = await fetch(`${API_URL}/ubicaciones/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUbicaciones(data.body || []);
    } catch (error) {
      console.error("Error al obtener ubicaciones:", error);
    }
  };

  const fetchSububicaciones = async () => {
    try {
      const response = await fetch(`${API_URL}/sububicaciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setSububicaciones(data.body || []);
    } catch (error) {
      console.error("Error al obtener sububicaciones:", error);
    }
  };

  useEffect(() => {
    fetchUbicaciones();
    fetchSububicaciones();
  }, [token]);

  const cargarInventario = async () => {
    try {
      if (!articuloSeleccionado) {
        toast.error("No hay artículos para cargar");
        return;
      }

      if (!vencimiento) {
        toast.error("Debe seleccionar una fecha de vencimiento");
        return;
      }
      if (!ubicacion) {
        toast.error("Debe seleccionar una ubicación");
        return;
      }
      if (!sububicacion) {
        toast.error("Debe seleccionar una sububicación");
        return;
      }
      if (!lote) {
        toast.error("Debe determinar un lote");
        return;
      }

      console.log("prevVencimiento:", prevVencimiento);
      console.log("vencimiento:", vencimiento);
      console.log("prevLote:", prevLote);
      console.log("lote:", lote);

      if (prevVencimiento !== vencimiento && prevLote === lote) {
        toast.error(
          "Debe cambiar el número de lote si cambia la fecha de vencimiento"
        );
        return;
      }

      const reconteo = {
        id_articulo: articuloSeleccionado.ar_codigo,
        id_lote: articuloSeleccionado.al_codigo,
        nro_lote: lote,
        segunda_cantidad: Number(existenciaFisica),
      };

      console.log(reconteo);

      const response = await fetch(`${API_URL}/articulos/insertar-reconteo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reconteo),
      });

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      await auditar(
        42,
        1,
        ultimoNroInventario,
        Number(localStorage.getItem("user_id")) || 1,
        `Reconteo hecho para artículo ${articuloSeleccionado.ar_codigo} del lote ${lote} desde Data Colector`
      );

      setModalVisible(false);
      toast.success("El inventario se cargó satisfactoriamente");
      setArticuloBusqueda("");
      setArticulos([]);
      searchInputRef.current?.focus();
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar el inventario");
    }
  };

  const handleSignOut = () => {
    console.log("Cerrando sesión");
    signOut();
    console.log("Sesión cerrada");
    setIsDrawerOpen(false);
    console.log("Drawer cerrado");
    navigate("/login");
    console.log("Navegando a login");
  };

  const calcularDiferencia = () => {
    const diferencia = Number(existenciaFisica) - Number(existenciaActual);
    return diferencia;
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      <Toaster
        position="bottom-center"
        toastOptions={{
          className: "",
          duration: 1000,
          style: {
            background: "#fff",
            color: "#363636",
            padding: "16px",
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            fontSize: "14px",
            maxWidth: "500px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          },
          success: {
            iconTheme: {
              primary: "#10B981",
              secondary: "#fff",
            },
            style: {
              border: "1px solid #10B981",
            },
          },
          error: {
            iconTheme: {
              primary: "#EF4444",
              secondary: "#fff",
            },
            style: {
              border: "1px solid #EF4444",
            },
          },
        }}
      />

      {/* Header Fijo */}
      <div className="bg-[#0455c1] rounded-b-3xl pb-4 z-10">
        <div className="flex  justify-between items-center px-4 pt-2 pb-4">
          <div className="flex items-start gap-4 flex-col">
            <h1 className="text-white text-xl font-bold">
              Reconteo de Inventario
            </h1>
            <h2 className="text-white text-xs font-medium">
              {deposito?.dep_descripcion}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsGridView(!isGridView)}
              className="bg-white/20 p-2 rounded"
            >
              {isGridView ? (
                <Grid size={20} color="white" />
              ) : (
                <List size={20} color="white" />
              )}
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
              inputMode="text"
              placeholder="Buscar producto"
              className="flex-1 p-3 rounded-lg"
              value={articuloBusqueda}
              onChange={(e) => handleBusqueda(e.target.value)}
              onClick={handleInputClick}
            />
          </div>
        </div>
      </div>

      {/* Lista de artículos con scroll - Ajustamos las clases */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {articulos.length > 0 ? (
            <motion.div
              className={`grid ${
                isGridView ? "grid-cols-2" : "grid-cols-1"
              } gap-4`}
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
                  <p className="text-xs text-gray-500">
                    Cod. Barras: {item.ar_codbarra}
                  </p>
                  <p className="text-xs text-gray-500">Lote: {item.al_lote}</p>
                  <p className="text-xs text-gray-500">
                    Vto.: {formatearVencimiento(item.al_vencimiento)}
                  </p>
                  <p className="font-bold my-1">{item.ar_descripcion}</p>
                  <p className="text-[#0455c1] font-medium">
                    Gs. {formatNumber(item.ar_pvg)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Stock: {item.al_cantidad}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            articuloBusqueda && (
              <div className="min-h-[200px] flex flex-col items-center justify-center text-gray-500">
                <p className="text-lg font-medium">
                  No se encontraron artículos
                </p>
                <p className="text-sm">Intente con otro código o descripción</p>
              </div>
            )
          )}
        </div>
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
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4">
                <h2 className="text-xl font-bold mb-6">Módulos</h2>
                <ul className="space-y-2">
                  <li>
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        navigate("/inventory");
                      }}
                      className="flex items-center gap-2 w-full text-gray-600 hover:text-gray-900"
                    >
                      <ScanIcon size={20} />
                      <span>Toma de inventario</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        navigate("/reconteo");
                      }}
                      className="flex items-center gap-2 w-full text-gray-600 hover:text-gray-900"
                    >
                      <ClipboardCheck />
                      <span>Reconteo de inventario</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        navigate("/report");
                      }}
                      className="flex items-center gap-2 w-full text-gray-600 hover:text-gray-900"
                    >
                      <ChartColumn />
                      <span>Reporte de inventario</span>
                    </button>
                  </li>
                </ul>
              </div>
              <div className="p-4">
                <h2 className="text-xl font-bold mb-6">Ajustes</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sucursal
                    </label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={sucursal?.id || ""}
                      onChange={(e) => {
                        const selected = sucursales.find(
                          (s) => s.id === Number(e.target.value)
                        );
                        setSucursal(selected || null);
                      }}
                    >
                      {sucursales.map((suc) => (
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
                      value={deposito?.dep_codigo || ""}
                      onChange={(e) => {
                        const selected = depositos.find(
                          (d) => d.dep_codigo === Number(e.target.value)
                        );
                        setDeposito(selected || null);
                        if (selected)
                          setDepositoId(String(selected.dep_codigo));
                      }}
                    >
                      {depositos.map((dep) => (
                        <option key={dep.dep_codigo} value={dep.dep_codigo}>
                          {dep.dep_descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => {
                    handleSignOut();
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
                <h2 className="text-xl font-bold">
                  Lote: {articuloSeleccionado?.al_lote}
                </h2>
                <button
                  onClick={() => setModalVisible(false)}
                  className="text-gray-500"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-500">
                  Inventario nro: {ultimoNroInventario}
                </p>
                <div className="flex space-x-14">
                  <p className="font-bold">{articuloSeleccionado?.ar_codigo}</p>
                  <p className="text-lg">
                    {articuloSeleccionado?.ar_descripcion}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exist. Actual
                  </label>
                  <input
                    type="number"
                    disabled
                    className="w-full p-2 border rounded"
                    value={existenciaActual}
                    onChange={(e) => setExistenciaActual(e.target.value)}
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
                    onChange={(e) => setExistenciaFisica(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Vencimiento
                </label>
                <input
                  disabled
                  type="date"
                  className="w-full p-2 border rounded"
                  value={vencimiento}
                  onChange={(e) => handleVencimientoChange(e.target.value)}
                />
              </div>

              {/* <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ubicacion
                  </label>
                  <select
                    disabled
                    className="w-full p-2 border rounded"
                    value={ubicacion || ""}
                    onChange={(e) => setUbicacion(Number(e.target.value))}
                  >
                    {ubicaciones.map((ub: Ubicaciones) => (
                      <option key={ub.ub_codigo} value={ub.ub_codigo}>
                        {ub.ub_descripcion}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sububicacion
                  </label>
                  <select
                  disabled
                    className="w-full p-2 border rounded"
                    value={sububicacion || ""}
                    onChange={(e) => setSububicacion(Number(e.target.value))}
                  >
                    {sububicaciones.map((sub) => (
                      <option key={sub.s_codigo} value={sub.s_codigo}>
                        {sub.s_descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div> */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lote
                  </label>
                  <input
                    disabled
                    placeholder="Solo p/ lote nuevo"
                    type="text"
                    className="w-full p-2 border rounded"
                    value={lote}
                    onChange={(e) => handleLoteChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código de barras
                  </label>
                  <input
                    disabled
                    type="text"
                    className="w-full p-2 border rounded"
                    value={codigoBarra}
                    onChange={(e) => setCodigoBarra(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex w-full mb-4">
                <p className="font-semibold text-sm text-red-600">
                  Diferencia: {calcularDiferencia()}{" "}
                </p>
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
  );
};

export default Reconteo;

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config/config";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useNavigate } from "react-router-dom";
import {
  ChartColumn,
  ClipboardCheck,
  LogOut,
  Menu,
  ScanIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Reporte {
  marca: string;
  deposito: string;
  fecha: string;
  codigo: number;
  codigobarra: string;
  nombre: string;
  lote: string;
  primer_conteo: number;
  segundo_conteo: number;
  diferencia: number;
  operador: string;
  inicio_fecha_reconteo: string;
}

interface Configuraciones {
  id: number;
  valor: string;
}

interface Deposito {
  dep_codigo: number;
  dep_descripcion: string;
  dep_principal: number;
  dep_inventario: number;
}

const Report = () => {
  const { token, signOut } = useAuth();
  const [reporte, setReporte] = useState<Reporte[]>([]);
  const fechaActual = new Date();
  const operador = localStorage.getItem("userName");
  const [configuracionesEmpresa, setConfiguracionesEmpresa] = useState<
    Configuraciones[]
  >([]);
  const navigate = useNavigate();
  const [pdfGenerado, setPdfGenerado] = useState(false);
  const [datosListos, setDatosListos] = useState(false);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [depositoSeleccionado, setDepositoSeleccionado] =
    useState<Deposito | null>(null);
  const [depositoId, setDepositoId] = useState<string>("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
        setDepositos(depositosData.body || []);

        const defaultDeposito = depositosData.body.find(
          (deposito: any) => deposito.dep_inventario === 1
        );
        if (defaultDeposito) {
          setDepositoSeleccionado(defaultDeposito);
          setDepositoId(String(defaultDeposito.dep_codigo));
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    };

    fetchSucursalesYDepositos();
  }, []);

  const fetchReporte = async () => {
    const response = await fetch(`${API_URL}/articulos/reporte-reconteo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      if (response.body) {
        const data = await response.json();
        console.log(data);
        setReporte(data.body);
      } else {
        console.error("Response body is null");
      }
    } else {
      console.error("Error al obtener el reporte");
    }
  };

  const fetchConfiguraciones = async () => {
    const response = await fetch(`${API_URL}/configuraciones/todos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      if (response.body) {
        const configuraciones = await response.json();
        console.log("Estas son las configuraciones", configuraciones);
        setConfiguracionesEmpresa(configuraciones.body);
      } else {
        console.error("No existen configuraciones");
      }
    } else {
      console.error("Error al obtener las configuraciones");
    }
  };

  const eliminarDecimales = (numero: number) => {
    const numeroAbs = Math.abs(numero);
    return Math.trunc(numeroAbs);
  };

  const setearColor = (numero: number) => {
    if (numero > 0) {
      return "text-green-700";
    } else if (numero < 0) {
      return "text-red-700";
    } else {
      return "text-gray-500";
    }
  };

  const obtenerDeposito = () => {
    if (reporte.length === 0) return null;

    const contador: { [key: string]: number } = {};

    reporte.forEach((articulo) => {
      const valor = articulo.deposito;
      if (valor in contador) {
        contador[valor]++;
      } else {
        contador[valor] = 1;
      }
    });

    let valorMasRepetido = null;
    let maxRepeticiones = 0;

    for (const [valor, repeticiones] of Object.entries(contador)) {
      if (repeticiones > maxRepeticiones) {
        maxRepeticiones = repeticiones;
        valorMasRepetido = valor;
      }
    }

    return valorMasRepetido;
  };

  const obtenerListaOperadores = () => {
    if (reporte.length === 0) return [];

    const operadores = new Set<string>();

    reporte.forEach((articulo) => {
      operadores.add(articulo.operador);
    });

    return Array.from(operadores);
  };

  const obtenerListaMarcas = () => {
    if (reporte.length === 0) return [];

    const marcas = new Set<string>();

    reporte.forEach((articulo) => {
      marcas.add(articulo.marca);
    });

    const marcasArray = Array.from(marcas);
    return marcasArray.length > 15 ? marcasArray.slice(0, 15) : marcasArray;
  };

  // Ejemplo de uso
  const marca = obtenerListaMarcas();
  const listaMarcas = marca.join(", ");
  const deposito = obtenerDeposito();
  const operadores = obtenerListaOperadores();
  const listaOperadores = operadores.join(", ");

  useEffect(() => {
    const fetchData = async () => {
      await fetchReporte();
      await fetchConfiguraciones();
      setDatosListos(true);
    };

    fetchData();
  }, []);

  const generarPDF = async () => {
    const elemento = document.getElementById("reporte");
    if (!elemento) return;

    // Generar el canvas a partir del elemento
    const canvas = await html2canvas(elemento, {
      scrollX: 0,
      scrollY: 0,
      windowWidth: elemento.scrollWidth,
      windowHeight: elemento.scrollHeight,
    });

    const pdf = new jsPDF("p", "mm", "a4");

    // Dimensiones del PDF
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Dimensiones del canvas
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    let yOffset = 0; // Posición vertical para empezar a recortar
    const marginTop = 8; // Margen superior para las páginas adicionales
    const marginBottom = 20; // Margen inferior
    let pageNumber = 1; // Número de página inicial

    while (yOffset < canvasHeight) {
      // Crear un canvas temporal para la sección de la página actual
      const pageCanvas = document.createElement("canvas");
      // Ajustar el tamaño de la página con margen inferior
      const pageHeight = Math.min(
        canvasHeight - yOffset,
        (canvasWidth * (pdfHeight - marginTop - marginBottom)) / pdfWidth
      );

      pageCanvas.width = canvasWidth;
      pageCanvas.height = pageHeight;

      const context = pageCanvas.getContext("2d");
      if (!context) {
        console.error("No se pudo obtener el contexto 2D del canvas.");
        return;
      }

      context.drawImage(
        canvas,
        0,
        yOffset,
        canvasWidth,
        pageHeight, // Parte del canvas original
        0,
        0,
        canvasWidth,
        pageHeight // Dibujo en el nuevo canvas
      );

      const pageImgData = pageCanvas.toDataURL("image/png");
      const pageHeightScaled = (pageHeight * pdfWidth) / canvasWidth;

      if (yOffset > 0) {
        pdf.addPage();
      }

      // Dibujar líneas y cuadros
      pdf.setDrawColor(145, 158, 181);
      pdf.setLineWidth(0.3);
      pdf.rect(5, marginTop - 5, pdfWidth - 10, 34); // Cuadro principal
      pdf.line(5, marginTop + 2, pdfWidth - 5, marginTop + 2); // Línea debajo de la cabecera
      pdf.line(5, marginTop + 22, pdfWidth - 5, marginTop + 22); // Línea debajo de la información adicional

      // Agregar la cabecera
      pdf.setFontSize(6);
      pdf.text(`Empresa: ${nombreEmpresa}`, 15, marginTop);
      pdf.text(`RUC: ${rucEmpresa}`, pdfWidth / 2, marginTop, {
        align: "center",
      });
      pdf.text(
        `${fechaActual.toLocaleDateString()} ${fechaActual.toLocaleTimeString()} - ${operador}`,
        pdfWidth - 40,
        marginTop
      );

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        "Informe de reconteo de Inventario",
        pdfWidth / 2,
        marginTop + 8,
        { align: "center" }
      );
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.text(`Depósito: ${deposito}`, 10, marginTop + 12);
      pdf.text(`Marca/as: ${listaMarcas}, ...`, 10, marginTop + 16);
      pdf.text(`Operador/es: ${listaOperadores}`, 10, marginTop + 20);
      pdf.text(
        `Fecha Inventario: ${obtenerMenorFechaInventario()} - ${obtenerMayorFechaInventario()}`,
        pdfWidth / 2,
        marginTop + 12,
        { align: "center" }
      );
      pdf.text(
        `Fecha Reconteo: ${obtenerMenorFechaReconteo()} - ${obtenerMayorFechaReconteo()}`,
        pdfWidth - 60,
        marginTop + 12,
        { align: "left" }
      );

      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Total de registros: ${reporte.length}`,
        pdfWidth - 40,
        marginTop + 26
      );
      pdf.text(`Página: ${pageNumber}`, 10, marginTop + 26);
      pageNumber++;

      // Agregar la imagen de la página
      pdf.addImage(
        pageImgData,
        "PNG",
        0,
        marginTop + 32,
        pdfWidth,
        pageHeightScaled - marginBottom
      );

      yOffset += pageHeight;
    }

    pdf.save("reporte.pdf");
  };

  const obtenerMenorFechaInventario = () => {
    if (reporte.length === 0) return null;

    const fechas = reporte
      .map((articulo) => new Date(articulo.fecha))
      .filter(
        (fecha) => !isNaN(fecha.getTime()) && fecha.getFullYear() !== 1000
      );

    if (fechas.length === 0) return null;

    const menorFecha = new Date(
      Math.min(...fechas.map((fecha) => fecha.getTime()))
    );

    const yyyy = menorFecha.getFullYear();
    const mm = String(menorFecha.getMonth() + 1).padStart(2, "0");
    const dd = String(menorFecha.getDate()).padStart(2, "0");

    return `${yyyy}/${mm}/${dd}`;
  };
  const obtenerMayorFechaInventario = () => {
    if (reporte.length === 0) return null;
    const fechas = reporte
      .map((articulo) => new Date(articulo.fecha))
      .filter((fecha) => !isNaN(fecha.getTime()));
    if (fechas.length === 0) return null;
    const mayorFecha = new Date(
      Math.max(...fechas.map((fecha) => fecha.getTime()))
    );
    const yyyy = mayorFecha.getFullYear();
    const mm = String(mayorFecha.getMonth() + 1).padStart(2, "0");
    const dd = String(mayorFecha.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  };

  const obtenerMenorFechaReconteo = () => {
    if (reporte.length === 0) return null;
    const fechas = reporte
      .map((articulo) => new Date(articulo.inicio_fecha_reconteo))
      .filter((fecha_reconteo) => !isNaN(fecha_reconteo.getTime()));
    if (fechas.length === 0) return null;
    const menorFecha = new Date(
      Math.min(...fechas.map((fecha_reconteo) => fecha_reconteo.getTime()))
    );
    const yyyy = menorFecha.getFullYear();
    const mm = String(menorFecha.getMonth() + 1).padStart(2, "0");
    const dd = String(menorFecha.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  };

  const obtenerMayorFechaReconteo = () => {
    if (reporte.length === 0) return null;
    const fechas = reporte
      .map((articulo) => new Date(articulo.inicio_fecha_reconteo))
      .filter((fecha_reconteo) => !isNaN(fecha_reconteo.getTime()));
    if (fechas.length === 0) return null;
    const mayorFecha = new Date(
      Math.max(...fechas.map((fecha_reconteo) => fecha_reconteo.getTime()))
    );
    const yyyy = mayorFecha.getFullYear();
    const mm = String(mayorFecha.getMonth() + 1).padStart(2, "0");
    const dd = String(mayorFecha.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  };

  const nombreEmpresa = configuracionesEmpresa[0]?.valor || "N/A";
  const rucEmpresa = configuracionesEmpresa[30]?.valor || "N/A";

  const generarPdfRapidamente = async () => {
    await generarPDF();
    navigate("/reconteo");
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

  useEffect(() => {
    if (datosListos && !pdfGenerado) {
      // generarPdfRapidamente();
      setPdfGenerado(true);
    }
  }, [datosListos, pdfGenerado]);

  return (
    <div className="overflow-auto  h-screen">
      {/* Header Fijo */}
      <div className="bg-[#0455c1] rounded-b-3xl pb-4 z-10">
        <div className="flex  justify-between items-center px-4 pt-2 pb-4">
          <div className="flex items-start gap-4 flex-col">
            <h1 className="text-white text-xl font-bold">
              Reporte de Inventario
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              className="bg-white/20 p-2 rounded"
              onClick={() => setIsDrawerOpen(true)}
            >
              <Menu size={20} color="white" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex  flex-col justify-between items-center px-4 pt-2 pb-4 gap-4">
        <div className="flex items-start gap-2 flex-col">
          <label className="font-bold text-sm">Selecciona un deposito:</label>
          <select
            className="w-full p-2 border rounded-md"
            value={depositoSeleccionado?.dep_codigo || ""}
            onChange={(e) => {
              const selected = depositos.find(
                (d) => d.dep_codigo === Number(e.target.value)
              );
              setDepositoSeleccionado(selected || null);
              if (selected) setDepositoId(String(selected.dep_codigo));
            }}
          >
            {depositos.map((dep) => (
              <option key={dep.dep_codigo} value={dep.dep_codigo}>
                {dep.dep_descripcion}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-start gap-2 flex-col">
          <label className="font-bold text-sm">Selecciona una marca(Opcional):</label>
          <select
            className="w-full p-2 border rounded-md"
            value={depositoSeleccionado?.dep_codigo || ""}
            onChange={(e) => {
              const selected = depositos.find(
                (d) => d.dep_codigo === Number(e.target.value)
              );
              setDepositoSeleccionado(selected || null);
              if (selected) setDepositoId(String(selected.dep_codigo));
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
                <div className="flex justify-center mb-4 items-center w-full gap-4">
                  <button className="bg-blue-500 p-2 rounded-md text-white font-semibold">
                    Iniciar Reconteo
                  </button>
                </div>
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

      <div
        className="flex flex-col p-4 px-16 h-full mb-30 mt-8 w-[2160px] mx-auto "
        id="reporte"
      >
        <div className="flex-1">
          <div className="p-4 flex justify-center">
            <table className="w-full bg-white text-xs leading-tight">
              <thead>
                <tr>
                  <th className="text-lg  px-1 border-b text-left">
                    Cod. Barra
                  </th>
                  <th className="text-lg  px-1 border-b text-left">Artículo</th>
                  <th className="text-lg  px-1 border-b text-left">Lote</th>
                  <th className="text-lg  px-1 border-b text-center">
                    Conteo Inicial
                  </th>
                  <th className="text-lg  px-1 border-b text-center">
                    Reconteo
                  </th>
                  <th className="text-lg  px-1 border-b text-right">Dif.</th>
                </tr>
              </thead>
              <tbody>
                {/* Aquí puedes mapear tus datos para generar las filas */}
                {reporte.map((articulo) => (
                  <tr key={articulo.codigo}>
                    <td className="text-lg py-1 px-1 border-b">
                      {articulo.codigobarra}
                    </td>
                    <td className="text-lg py-1 px-1 border-b">
                      {articulo.nombre}
                    </td>
                    <td className="text-lg py-1 px-1 border-b">
                      {articulo.lote}
                    </td>
                    <td className="text-lg py-1 px-1 border-b text-center">
                      {eliminarDecimales(articulo.primer_conteo)}
                    </td>
                    <td className="text-lg py-1 px-1 border-b text-center">
                      {eliminarDecimales(articulo.segundo_conteo)}
                    </td>
                    <td
                      className={`text-lg py-1 px-1 border-b text-right font-bold ${setearColor(
                        articulo.diferencia
                      )}`}
                    >
                      {eliminarDecimales(articulo.diferencia)}
                    </td>
                  </tr>
                ))}
                {/* Agrega más filas según sea necesario */}
              </tbody>
            </table>
          </div>
          <p className="text-center font-bold text-3xl mb-8">Fin del informe</p>
        </div>
      </div>
    </div>
  );
};

export default Report;
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Inventory from "../src/components/Inventory";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import Reconteo from "./components/Reconteo";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

// Componente separado para las rutas
function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Ruta pública */}
      <Route
        path="/login"
        element={!isAuthenticated ? <Login /> : <Navigate to="/inventory" />}
      />

      {/* Ruta protegida */}
      <Route
        path="/inventory"
        element={isAuthenticated ? <Inventory /> : <Navigate to="/login" />}
      />

      <Route
        path="/reconteo"
        element={isAuthenticated ? <Reconteo /> : <Navigate to="/login" />}
      />

      {/* Redirección por defecto */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? "/inventory" : "/login"} />}
      />
    </Routes>
  );
}

export default App;

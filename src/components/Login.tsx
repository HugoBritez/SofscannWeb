// src/components/Login.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import loginBg from "../assets/loginbg.jpg";
import sofmarLogo from "../assets/sofmar_logo.png";

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState<LoginForm>({
    username: "",
    password: "",
  });
  const [focusedInput, setFocusedInput] = useState<
    "username" | "password" | null
  >(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    try {
      if (!form.username || !form.password) {
        alert("Por favor ingrese su nombre de usuario y contraseña");
        return;
      }

      await signIn(form.username, form.password);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error completo:", error);
      alert(error.message || "No se pudo conectar con el servidor");
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex flex-col justify-end"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="text-white text-center text-lg font-bold mb-5 shadow-text">
        0971 271 288 - administracion@sofmarsistema.net
      </div>

      <div className="bg-white rounded-t-3xl p-8 h-4/5 flex flex-col items-center">
        <img
          src={sofmarLogo}
          alt="Sofmar Logo"
          className="w-48 h-24 object-contain mb-6"
        />

        <h2 className="text-lg font-bold mb-8 text-center text-black">
          Inicia sesión con tu cuenta de usuario
        </h2>

        <div className="w-full space-y-4">
          <input
            type="text"
            placeholder="Ingrese su nombre de usuario"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            onFocus={() => setFocusedInput("username")}
            onBlur={() => setFocusedInput(null)}
            className={`w-full p-3 border rounded-lg text-base font-bold text-black
              ${
                focusedInput === "username"
                  ? "border-[#0455c1] border-2"
                  : "border-[#eaeaea]"
              }
              focus:outline-none`}
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Ingrese su contraseña"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onFocus={() => setFocusedInput("password")}
              onBlur={() => setFocusedInput(null)}
              className={`w-full p-3 border rounded-lg text-base font-bold text-black
                ${
                  focusedInput === "password"
                    ? "border-[#0455c1] border-2"
                    : "border-[#eaeaea]"
                }
                focus:outline-none`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-500"
            >
              {showPassword ? (
                <EyeOff className="h-6 w-6" />
              ) : (
                <Eye className="h-6 w-6" />
              )}
            </button>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-[#0455c1] text-white p-3 rounded-lg font-bold h-12
              hover:bg-[#034096] transition-colors"
          >
            Ingresar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

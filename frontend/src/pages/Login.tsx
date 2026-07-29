// src/pages/Login.tsx
import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { apiCall } from "../services/api";
import { BACKEND_URL } from "../config";
import { isValidEmail } from "../utils/validationUtils";
import type { User } from "../types/chat";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { loginState } = useAuthStore();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [rememberMe] = React.useState(false);

  React.useEffect(() => {
    const oauth = searchParams.get("oauth");
    if (oauth === "success") {
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");

      if (accessToken && refreshToken) {
        setLoading(true);
        try {
          const payloadB64 = accessToken.split(".")[1];
          const tokenPayload = JSON.parse(
            atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")),
          );
          const userId = tokenPayload.ID || tokenPayload.id || 0;

          const initialUser: User = {
            id: userId,
            refresh_token: refreshToken,
            email: tokenPayload.email || "",
            username: tokenPayload.username || "",
            name: "",
            bio: "",
            profile_picture: undefined,
          };
          loginState(accessToken, initialUser);

          apiCall<{ data: User }>(`/user/${userId}`, { method: "GET" })
            .then((res) => {
              if (res.data) {
                loginState(accessToken, {
                  ...res.data,
                  refresh_token: refreshToken,
                });
              }
            })
            .catch((err) => console.error("Failed sync profile:", err))
            .finally(() => {
              setLoading(false);
              navigate(redirectTo);
            });
        } catch (err) {
          setLoading(false);
          setError("Failed to process OAuth login.");
        }
      }
    }
  }, [searchParams, navigate, loginState, redirectTo]);

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/auth/google?rememberMe=${rememberMe}&prompt=consent`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const resp = await apiCall<any>("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember_me: rememberMe }),
      });

      if (resp.data && resp.data.access_token) {
        try {
          const payloadB64 = resp.data.access_token.split(".")[1];
          const decodedStr = atob(
            payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
          );
          const tokenPayload = JSON.parse(decodedStr);
          const userId = tokenPayload.ID || tokenPayload.id || 0;

          loginState(resp.data.access_token, {
            id: userId,
            email: resp.data.email,
            username: resp.data.username,
            name: resp.data.name,
            bio: resp.data.bio || "",
            profile_picture: resp.data.profile_picture,
            refresh_token: resp.data.refresh_token,
            created_at: resp.data.created_at,
          } as User);
          navigate(redirectTo);
        } catch (e) {
          setError("Failed to parse session token.");
        }
      } else {
        setError("Invalid response from server");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-sans bg-[#0c0c0e] text-[#f1f5f9] flex flex-col items-center justify-center w-full relative">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-6 md:p-10 flex justify-between items-center z-20">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/zra.svg" alt="Zra" className="w-7 h-7" />
          <span className="font-bold text-[19px] text-white tracking-tight">Zra</span>
        </Link>
      </div>

      {/* Form Container */}
      <div className="flex flex-col justify-center w-full max-w-[420px] mx-auto px-6 py-12 relative z-10 my-auto">
        <div className="mb-8">
          <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-[#7fa6ff] mb-3">
            Authentication
          </p>
          <h1 className="text-[34px] md:text-[38px] font-extrabold tracking-tight text-white mb-2.5 leading-[1.1]">
            Welcome!
          </h1>
          <p className="text-[#a1a1aa] text-[14px] font-medium tracking-tight">
            Log in to your account to continue.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-[13px] text-center font-medium animate-fade-in shadow-lg">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-[14px] px-4 bg-[#131316] hover:bg-[#1a1a1d] border border-white/5 rounded-xl transition-all duration-200 group active:scale-[0.98] mb-7 shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span className="text-[13px] font-bold text-[#e4e4e7] group-hover:text-white transition-colors">
            Continue with Google
          </span>
        </button>

        <div className="relative mb-4 flex items-center">
          <div className="flex-1 border-t border-white/5"></div>
          <span className="px-5 text-[10px] uppercase font-bold tracking-[0.2em] text-[#52525b]">or</span>
          <div className="flex-1 border-t border-white/5"></div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="space-y-2.5">
            <label className="text-[10px] uppercase tracking-[0.1em] font-bold text-[#d4d4d8] ml-0.5" htmlFor="email">
              Email Address
            </label>
            <div className="relative group mt-2">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52525b] group-focus-within:text-[#e4e4e7] transition-colors">
                <Mail size={16} className="stroke-[2.5]" />
              </div>
              <input
                id="email"
                type="email"
                className="w-full bg-[#131316] border border-transparent text-[#f1f5f9] text-[13.5px] rounded-xl block py-[14px] pl-[38px] pr-3.5 placeholder:text-[#52525b] focus:border-white/10 focus:bg-[#18181b] focus:ring-0 transition-all duration-300 outline-none placeholder:font-medium shadow-sm"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-end ml-0.5">
              <label className="text-[10px] uppercase tracking-[0.1em] font-bold text-[#d4d4d8]" htmlFor="password">
                Password
              </label>
              <Link className="text-[11px] font-bold text-[#7fa6ff] hover:text-[#9bb7ff] transition-colors tracking-tight" to="/forgot-password">
                Forgot password?
              </Link>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52525b] group-focus-within:text-[#e4e4e7] transition-colors">
                <Lock size={16} className="stroke-[2.5]" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="w-full bg-[#131316] border border-transparent text-[#f1f5f9] text-[13.5px] rounded-xl block py-[14px] pl-[38px] pr-10 placeholder:text-[#52525b] focus:border-white/10 focus:bg-[#18181b] focus:ring-0 transition-all duration-300 outline-none placeholder:font-medium tracking-tight shadow-sm"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#52525b] hover:text-[#a1a1aa] transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} className="stroke-[2.5]" /> : <Eye size={16} className="stroke-[2.5]" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#82a3fb] hover:bg-[#92b0fc] active:scale-[0.98] text-[#0c0c0e] font-bold py-[14px] rounded-xl text-[14px] transition-all duration-200 mt-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(130,163,251,0.15)]"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="absolute bottom-5 left-0 w-full text-center pb-8 z-20">
        <p className="text-[13px] text-[#71717a] font-medium tracking-tight">
          Don't have an account?
          <Link className="text-[#f1f5f9] font-bold hover:underline ml-1.5 transition-all" to="/register">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

// src/pages/Login.tsx
import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { apiCall } from "../services/api";
import { BACKEND_URL } from "../config";
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
  const [rememberMe, setRememberMe] = React.useState(false);

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
              console.log("Profile API response:", res);
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

  const isValidEmail = (email: string) => {
    // Harus ada @, domain minimal 2 karakter, TLD minimal 2 karakter (com, id, net, dll)
    const regex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!regex.test(email)) return false;

    // Blacklist TLD yang tidak valid / typo umum
    const invalidTLDs = [".co", ".c", ".om", ".cm"];
    const lower = email.toLowerCase();
    if (invalidTLDs.some((tld) => lower.endsWith(tld))) return false;

    return true;
  };

  return (
    <div className="min-h-screen font-sans text-[#f1f5f9] relative overflow-hidden selection:bg-[#3b82f6]/30">

      <div className="flex flex-col min-h-screen">
        <main className="flex-1 w-full flex items-center justify-start flex-col pt-4 md:pt-10 p-4 md:p-8 z-10 animate-fade-in">
          <div className="w-full max-w-[450px]">
            {/*Login Card */}
            <div className="glass-card rounded-[2rem] px-6 md:px-8 py-6 md:py-8 shadow-2xl relative">
              {/* Brand & Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 shadow-sm shadow-[#3b82f6]/10 border border-[#3b82f6]/20">
                  <img src="/zra.svg" alt="Zra" className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-[#f1f5f9] mb-2 font-headline">Welcome Back</h1>
                <p className="text-[#94a3b8] text-xs font-medium">Continue your conversations to Zra</p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl mb-6 text-[13px] text-center animate-shake">
                  {error}
                </div>
              )}

              {/* Login Form */}
              <form className="space-y-2" onSubmit={handleSubmit}>
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#94a3b8] ml-1" htmlFor="email">Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#64748b] group-focus-within:text-[#3b82f6] transition-colors">
                      <Mail size={18} />
                    </div>
                    <input
                      id="email"
                      type="email"
                      className="w-full bg-[#0f1114] border border-[#1e293b] text-[#f1f5f9] text-sm rounded-xl block py-3 pl-11 pr-4 mt-3 placeholder:text-[#475569] focus:border-[#3b82f6]/50 focus:ring-0 transition-all duration-200 outline-none"
                      placeholder="Enter Email Adress"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between items-end ml-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#94a3b8]" htmlFor="password">Password</label>
                    <Link className="text-[10px] font-bold text-[#3b82f6] hover:text-[#3b82f6]/80 transition-colors uppercase tracking-tight" to="/forgot-password">Forgot Password?</Link>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#64748b] group-focus-within:text-[#3b82f6] transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-[#0f1114] border border-[#1e293b] text-[#f1f5f9] text-sm rounded-xl block py-3 pl-11 pr-12 placeholder:text-[#475569] focus:border-[#3b82f6]/50 focus:ring-0 transition-all duration-200 outline-none"
                      placeholder="Enter Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#64748b] hover:text-[#f1f5f9] transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center my-3 px-1">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="w-4 h-4 text-[#3b82f6] bg-[#0f1114] border-[#1e293b] rounded focus:ring-[#3b82f6] focus:ring-offset-[#0b0e11] cursor-pointer"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label className="ml-2.5 my-2 text-xs font-medium text-[#94a3b8] cursor-pointer" htmlFor="remember-me">Remember Me</label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#3b82f6] cursor-pointer hover:bg-[#3b82f6]/90 text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] active:scale-[0.98] transition-all duration-200 text-[13px] tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Signing In..." : "Sign In To Zra"}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-[0.2em] text-[#64748b]">
                  <span className="bg-[#0b0e11]/50 backdrop-blur-md px-3">or sign in using</span>
                </div>
              </div>

              {/* Social Logins */}
              <div className="mt-2 text-center">
                <button
                  type="button"
                  className="w-full cursor-pointer flex items-center justify-center gap-3 py-3 px-4 bg-[#0f1114] border border-[#1e293b] rounded-xl hover:bg-[#1d283a] transition-colors duration-200 group active:scale-95"
                  onClick={handleGoogleLogin}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span className="text-[11px] font-bold text-[#f1f5f9]">Google</span>
                </button>
              </div>

              {/* Footer Link */}
              <div className="mt-2 text-center border-t border-white/5 pt-6">
                <p className="text-[13px] text-[#94a3b8] font-medium">
                  Don't have an account?
                  <Link className="text-[#3b82f6] font-bold hover:underline underline-offset-4 ml-2 transition-all" to="/register">Create an account</Link>
                </p>
              </div>
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}

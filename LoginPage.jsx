// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login(form.email, form.password);

      if (user.role === "ADMIN") {
        navigate("/admin", { replace: true });
        return;
      }

      // Go straight to POS — the session middleware will redirect
      // to /open-sales only when the user tries an action that needs a session.
      navigate("/pos", { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message || "Invalid email or password";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fef9f2] px-4 py-6">
      <div className="w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-[0_10px_30px_rgba(61,12,2,0.08)]">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold text-[#3d0c02]">Staff Login</h1>
          <p className="mt-2 text-sm text-[#54433f]">
            Enter your credentials to access the terminal
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="px-1 text-sm font-bold text-[#54433f]">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="staff@example.com"
              value={form.email}
              onChange={handleChange}
              className="h-12 w-full rounded-xl bg-[#f8f3ec] px-4 text-sm outline-none focus:ring-2 focus:ring-[#E8A020]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="px-1 text-sm font-bold text-[#54433f]">
              Password
            </label>
            <div className="flex items-center rounded-xl bg-[#f8f3ec] pr-3">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={form.password}
                onChange={handleChange}
                className="h-12 w-full rounded-xl bg-transparent px-4 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-xs font-semibold text-[#3d0c02]/70"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className={`h-12 rounded-xl text-sm font-bold text-white ${
              loading ? "cursor-not-allowed bg-gray-300" : "bg-[#E8A020]"
            }`}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
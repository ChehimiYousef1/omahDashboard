import { useState } from "react";
import axios from "axios";
import type { User } from "../services/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function LoginPage({ onSuccess }: { onSuccess: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await axios.post(
        `${API_URL}/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      onSuccess(res.data.user);
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err) &&
        err.response?.status === 429
          ? "Too many attempts. Try again in 15 minutes."
          : "Invalid email or password."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-5">
          <img
            src="/branding/omah-logo.svg"
            alt="OMAHCONNECT"
            className="h-12 w-auto max-w-full object-contain object-left"
          />
        </div>

        <h1 className="text-xl font-bold text-slate-900">
          OMAHCONNECT
        </h1>

        <p className="mb-6 text-sm text-slate-500">
          Administrative console
        </p>

        <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
        <input
          type="email"
          value={email}
          autoComplete="username"
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
        />

        <label className="mb-1 block text-xs font-semibold text-slate-600">Password</label>
        <input
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
        />

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={busy || !email || !password}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </div>
  );
}

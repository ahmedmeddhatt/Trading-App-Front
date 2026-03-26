"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import { useLanguage } from "@/context/LanguageContext";

function ResetPasswordForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("auth.passwordsNoMatch"));
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      await apiClient.post("/api/auth/reset-password", { token, password });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setIsPending(false);
    }
  };

  if (success) {
    return (
      <div className="bg-gray-900 rounded-xl p-6">
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/20 rounded-lg p-3">
          <CheckCircle size={16} />
          <span>{t("auth.passwordReset")}</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 space-y-4">
      {!searchParams.get("token") && (
        <div className="space-y-1">
          <label className="text-gray-500 text-xs">{t("auth.resetTokenLabel")}</label>
          <input
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-gray-500 text-xs">{t("auth.newPassword")}</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-gray-500 text-xs">{t("auth.confirmPassword")}</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-900/20 rounded-lg p-3">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            <span>{t("auth.resetting")}</span>
          </>
        ) : (
          t("auth.resetPasswordBtn")
        )}
      </button>

      <p className="text-center text-gray-500 text-sm">
        <Link href="/login" className="text-blue-400 hover:text-blue-300">
          {t("auth.backToLogin")}
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Activity className="text-blue-400" size={28} />
          <h1 className="text-xl font-bold tracking-tight">TradeDesk</h1>
          <p className="text-gray-500 text-sm">{t("auth.setANewPassword")}</p>
        </div>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

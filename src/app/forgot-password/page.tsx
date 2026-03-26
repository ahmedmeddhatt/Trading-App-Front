"use client";

import { useState } from "react";
import { Activity, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import { useLanguage } from "@/context/LanguageContext";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const data = await apiClient.post<{ resetToken: string }>("/api/auth/forgot-password", { email });
      setResetToken(data.resetToken);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Activity className="text-blue-400" size={28} />
          <h1 className="text-xl font-bold tracking-tight">TradeDesk</h1>
          <p className="text-gray-500 text-sm">{t("auth.resetPassword")}</p>
        </div>

        {resetToken ? (
          <div className="bg-gray-900 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/20 rounded-lg p-3">
              <CheckCircle size={16} />
              <span>{t("auth.tokenGenerated")}</span>
            </div>
            <div className="space-y-1">
              <label className="text-gray-500 text-xs">{t("auth.yourResetToken")}</label>
              <div className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white text-xs break-all font-mono">
                {resetToken}
              </div>
            </div>
            <Link
              href={`/reset-password?token=${resetToken}`}
              className="block w-full py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white text-center transition-colors"
            >
              {t("auth.setNewPasswordBtn")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-gray-500 text-xs">{t("auth.email")}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  <span>{t("auth.sending")}</span>
                </>
              ) : (
                t("auth.sendResetLink")
              )}
            </button>

            <p className="text-center text-gray-500 text-sm">
              <Link href="/login" className="text-blue-400 hover:text-blue-300">
                {t("auth.backToLogin")}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

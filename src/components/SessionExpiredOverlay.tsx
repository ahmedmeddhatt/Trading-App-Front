"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Lock } from "lucide-react";

let _trigger: (() => void) | null = null;

/** Call this from anywhere (queryClient, apiClient) to show the overlay */
export function triggerSessionExpired() {
  _trigger?.();
}

export default function SessionExpiredOverlay() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    _trigger = () => setVisible(true);
    return () => { _trigger = null; };
  }, []);

  if (!visible) return null;

  const handleLogin = () => {
    const next = encodeURIComponent(window.location.pathname);
    router.push(`/login?next=${next}`);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-8 mx-4 max-w-sm w-full text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
          <Lock size={26} className="text-amber-500 dark:text-amber-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-gray-900 dark:text-white font-bold text-lg">Session Expired</h2>
          <p className="text-gray-500 text-sm">Your session has ended. Please log in again to continue.</p>
        </div>
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20"
        >
          <LogIn size={16} />
          Log In
        </button>
      </div>
    </div>
  );
}

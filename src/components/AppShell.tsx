"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity, LayoutDashboard, BarChart2, Briefcase, LineChart, LogOut,
  Receipt, ShieldAlert,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";

const NAV_ITEMS = [
  { href: "/dashboard",               label: "Overview",      icon: LayoutDashboard },
  { href: "/stocks",                  label: "Stocks",        icon: BarChart2 },
  { href: "/portfolio",               label: "Portfolio",     icon: Briefcase },
  { href: "/portfolio/transactions",  label: "Transactions",  icon: Receipt },
  { href: "/analytics",               label: "Analytics",     icon: LineChart },
  { href: "/analytics/risk",          label: "Risk",          icon: ShieldAlert },
];

function isActive(href: string, pathname: string) {
  if (href === "/stocks") return pathname.startsWith("/stocks");
  if (href === "/portfolio") return pathname === "/portfolio" || pathname.startsWith("/portfolio/positions");
  if (href === "/analytics") return pathname === "/analytics";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = async () => {
    await apiClient.post("/api/auth/logout", {}).catch(() => {});
    router.push("/login");
  };

  return (
    <>
      {/* Raw CSS — no Tailwind, no JS needed */}
      <style>{`
        .td-desktop-nav { display: flex; }
        .td-mobile-nav  { display: none; }
        .td-sign-label  { display: inline; }
        .td-content-pad { padding-top: 56px; padding-bottom: 0; }
        @media (max-width: 639px) {
          .td-desktop-nav { display: none; }
          .td-mobile-nav  { display: flex; }
          .td-sign-label  { display: none; }
          .td-content-pad { padding-bottom: 64px; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-950 text-white" style={{ overflowX: "hidden" }}>

        {/* ── Top header ──────────────────────────────────── */}
        <header
          className="border-b border-gray-800 bg-gray-950 px-4 py-3 flex items-center justify-between"
          style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50 }}
        >
          <div className="flex items-center gap-2">
            <Activity className="text-blue-400" size={18} />
            <span className="font-bold text-base tracking-tight">TradeDesk</span>
          </div>

          {/* Desktop nav links */}
          <nav className="td-desktop-nav items-center gap-1">
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(href, pathname)
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut size={14} />
            <span className="td-sign-label">Sign out</span>
          </button>
        </header>

        {/* Page content */}
        <div className="td-content-pad">{children}</div>

        {/* ── Mobile bottom tab bar ──────────────────────── */}
        <div
          className="td-mobile-nav border-t border-gray-800 bg-gray-950"
          style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50 }}
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                style={{ flex: 1 }}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                  active ? "text-blue-400" : "text-gray-500"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                <span style={{ fontSize: 10 }}>{label}</span>
              </Link>
            );
          })}
        </div>

      </div>
    </>
  );
}

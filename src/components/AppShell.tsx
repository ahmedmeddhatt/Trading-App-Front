"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity, LayoutDashboard, BarChart2, Briefcase, LineChart, LogOut,
  Receipt, ShieldAlert, Sun, Moon,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useTheme } from "@/context/ThemeContext";

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
  const { theme, toggle } = useTheme();

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

      <div
        className={`min-h-screen text-white ${theme === "dark" ? "bg-gray-950" : "bg-[#EEF2FB]"}`}
        style={{ overflowX: "hidden" }}
      >

        {/* ── Top header ──────────────────────────────────── */}
        <header
          className={`px-4 py-3 flex items-center justify-between ${
            theme === "dark"
              ? "border-b border-gray-800 bg-gray-950"
              : "bg-white border-b border-[#D8E4F4]"
          }`}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
            boxShadow: theme === "light" ? "0 1px 12px rgba(14,30,60,0.07)" : undefined,
          }}
        >
          <div className="flex items-center gap-2">
            <Activity className="text-blue-500" size={18} />
            <span className={`font-bold text-base tracking-tight ${theme === "dark" ? "text-white" : "text-[#0C1A2E]"}`}>
              TradeDesk
            </span>
          </div>

          {/* Desktop nav links */}
          <nav className="td-desktop-nav items-center gap-0.5">
            {NAV_ITEMS.map(({ href, label }) => {
              const active = isActive(href, pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? theme === "dark"
                        ? "bg-gray-800 text-white"
                        : "bg-blue-50 text-blue-700 font-semibold"
                      : theme === "dark"
                        ? "text-gray-400 hover:text-white hover:bg-gray-800/60"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className={`p-1.5 rounded-lg transition-colors ${
                theme === "dark"
                  ? "text-gray-400 hover:text-white hover:bg-gray-800"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                theme === "dark"
                  ? "text-gray-400 hover:text-white hover:bg-gray-800"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <LogOut size={14} />
              <span className="td-sign-label">Sign out</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="td-content-pad">{children}</div>

        {/* ── Mobile bottom tab bar ──────────────────────── */}
        <div
          className={`td-mobile-nav ${
            theme === "dark" ? "border-t border-gray-800 bg-gray-950" : "bg-white border-t border-[#D8E4F4]"
          }`}
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
            boxShadow: theme === "light" ? "0 -2px 16px rgba(14,30,60,0.07)" : undefined,
          }}
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                style={{ flex: 1 }}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "text-blue-500"
                    : theme === "dark" ? "text-gray-500" : "text-slate-400"
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

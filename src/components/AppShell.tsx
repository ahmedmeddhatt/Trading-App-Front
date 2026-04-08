"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity, LayoutDashboard, BarChart2, Briefcase, LineChart, LogOut,
  Receipt, ShieldAlert, Sun, Moon, Lightbulb, UserCircle,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

const NAV_KEYS = [
  { href: "/dashboard",              key: "nav.overview",     icon: LayoutDashboard },
  { href: "/stocks",                 key: "nav.stocks",       icon: BarChart2 },
  { href: "/portfolio",              key: "nav.portfolio",    icon: Briefcase },
  { href: "/portfolio/transactions", key: "nav.transactions", icon: Receipt },
  { href: "/analytics",              key: "nav.analytics",    icon: LineChart },
  { href: "/analytics/risk",         key: "nav.risk",         icon: ShieldAlert },
  { href: "/strategies",             key: "nav.strategies",   icon: Lightbulb },
  { href: "/profile",                key: "nav.profile",      icon: UserCircle },
] as const;

const MOBILE_NAV_KEYS = [
  NAV_KEYS.find((n) => n.href === "/dashboard")!,
  NAV_KEYS.find((n) => n.href === "/stocks")!,
  NAV_KEYS.find((n) => n.href === "/portfolio")!,
  NAV_KEYS.find((n) => n.href === "/analytics")!,
  NAV_KEYS.find((n) => n.href === "/profile")!,
];

function isActive(href: string, pathname: string) {
  if (href === "/stocks")    return pathname.startsWith("/stocks");
  if (href === "/portfolio") return pathname === "/portfolio" || pathname.startsWith("/portfolio/positions");
  if (href === "/analytics") return pathname === "/analytics";
  return pathname === href || pathname.startsWith(href + "/");
}

const btnBase = "rounded-lg transition-all duration-150";
const darkBtn = "text-gray-400 hover:text-white hover:bg-gray-800 active:scale-95";
const lightBtn = "text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname           = usePathname();
  const router             = useRouter();
  const { theme, toggle }  = useTheme();
  const { lang, t, toggleLang } = useLanguage();

  const isDark  = theme === "dark";
  const btnCls  = isDark ? darkBtn : lightBtn;

  const handleLogout = async () => {
    await apiClient.post("/api/auth/logout", {}).catch(() => {});
    router.push("/login");
  };

  return (
    <>
      <style>{`
        .td-desktop-nav { display: flex; }
        .td-mobile-nav  { display: none; }
        .td-sign-label  { display: inline; }
        .td-content-pad { padding-top: 56px; padding-bottom: 0; }

        /* Mobile nav: scrollable row, hides scrollbar */
        .td-mobile-nav {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .td-mobile-nav::-webkit-scrollbar { display: none; }

        @media (max-width: 639px) {
          .td-desktop-nav { display: none; }
          .td-mobile-nav  { display: flex; }
          .td-sign-label  { display: none; }
          .td-content-pad { padding-bottom: 68px; }
        }

        /* Prevent tables from stretching page on mobile */
        @media (max-width: 639px) {
          .td-scroll-x { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
      `}</style>

      <div
        className={`min-h-screen ${isDark ? "bg-gray-950 text-white" : "bg-[#EEF2FB] text-[#0C1A2E]"}`}
        style={{ overflowX: "hidden" }}
      >

        {/* ── Top header ───────────────────────────────────── */}
        <header
          className={`px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 ${
            isDark ? "border-b border-gray-800 bg-gray-950" : "bg-white border-b border-[#D8E4F4]"
          }`}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
            boxShadow: !isDark ? "0 1px 12px rgba(14,30,60,0.07)" : undefined,
          }}
        >
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-1.5 shrink-0">
            <Activity className="text-blue-500" size={18} />
            <span className={`font-bold text-sm sm:text-base tracking-tight ${isDark ? "text-white" : "text-[#0C1A2E]"}`}>
              TradeDesk
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="td-desktop-nav items-center gap-0.5 min-w-0 overflow-x-auto">
            {NAV_KEYS.map(({ href, key }) => {
              const active = isActive(href, pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 active:scale-95 ${
                    active
                      ? isDark ? "bg-gray-800 text-white shadow-sm" : "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                      : isDark ? "text-gray-400 hover:text-white hover:bg-gray-800/70 hover:shadow-sm"
                              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:shadow-sm"
                  }`}
                >
                  {t(key)}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              aria-label="Toggle language"
              className={`px-2 py-1.5 ${btnBase} ${btnCls} text-xs font-semibold tracking-wide`}
              style={{ fontFamily: lang === "ar" ? "inherit" : undefined }}
            >
              {lang === "en" ? "AR" : "EN"}
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className={`p-1.5 ${btnBase} ${btnCls}`}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Sign out */}
            <button
              onClick={handleLogout}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm ${btnBase} ${btnCls}`}
            >
              <LogOut size={14} />
              <span className="td-sign-label">{t("nav.signOut")}</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="td-content-pad">{children}</div>

        {/* ── Mobile bottom tab bar ─────────────────────────── */}
        <div
          className={`td-mobile-nav ${isDark ? "border-t border-gray-800 bg-gray-950" : "bg-white border-t border-[#D8E4F4]"}`}
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
            boxShadow: !isDark ? "0 -2px 16px rgba(14,30,60,0.07)" : undefined,
          }}
        >
          {MOBILE_NAV_KEYS.map(({ href, key, icon: Icon }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 py-3 font-medium transition-colors ${
                  active ? "text-blue-500" : isDark ? "text-gray-500" : "text-slate-400"
                }`}
                style={{ minWidth: 52, flex: "1 0 52px" }}
              >
                <Icon size={23} strokeWidth={active ? 2.5 : 1.5} />
                <span style={{ fontSize: 10, lineHeight: 1.2, textAlign: "center", fontWeight: active ? 600 : 500 }}>{t(key)}</span>
              </Link>
            );
          })}
        </div>

      </div>
    </>
  );
}

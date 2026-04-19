"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity, LayoutDashboard, BarChart2, Briefcase, LineChart, LogOut,
  Receipt, ShieldAlert, Sun, Moon, Lightbulb, UserCircle, Coins,
  MoreHorizontal,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTradingModeStore } from "@/store/useTradingMode";

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

/** Primary nav items always visible on desktop */
const PRIMARY_NAV = NAV_KEYS.filter(
  (n) => !["/analytics/risk", "/strategies"].includes(n.href),
);
/** Overflow nav items collapsed into "More" on smaller desktops */
const OVERFLOW_NAV = NAV_KEYS.filter(
  (n) => ["/analytics/risk", "/strategies"].includes(n.href),
);

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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const isDark  = theme === "dark";
  const btnCls  = isDark ? darkBtn : lightBtn;
  const tradingMode = useTradingModeStore((s) => s.mode);
  const isGoldMode = tradingMode === "GOLD";

  const handleLogout = async () => {
    await apiClient.post("/api/auth/logout", {}).catch(() => {});
    router.push("/login");
  };

  const navLinkCls = (active: boolean) =>
    `px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 active:scale-95 ${
      active
        ? isDark ? "bg-gray-800 text-white shadow-sm" : "bg-blue-50 text-blue-700 font-semibold shadow-sm"
        : isDark ? "text-gray-400 hover:text-white hover:bg-gray-800/70 hover:shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:shadow-sm"
    }`;

  return (
    <>
      {/* Skip to content — accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>

      <style>{`
        .td-desktop-nav { display: flex; }
        .td-mobile-nav  { display: none; }
        .td-sign-label  { display: inline; }
        .td-content-pad { padding-top: 56px; padding-bottom: 0; }

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

        @media (max-width: 639px) {
          .td-scroll-x { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }

        /* Desktop nav overflow mask */
        .td-desktop-nav {
          mask-image: linear-gradient(to right, black 90%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%);
        }
        .td-desktop-nav:not(:hover) {
          mask-image: none;
          -webkit-mask-image: none;
        }
      `}</style>

      <div
        className={`min-h-screen ${isDark ? "bg-gray-950 text-white" : "bg-[#EEF2FB] text-[#0C1A2E]"}`}
        style={{ overflowX: "hidden" }}
      >

        {/* ── Top header ─────────────────────────────────── */}
        <header
          className={`px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 ${
            isDark ? "border-b border-gray-800 bg-gray-950" : "bg-white border-b border-[#D8E4F4]"
          }`}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
            boxShadow: !isDark ? "0 1px 12px rgba(14,30,60,0.07)" : undefined,
          }}
        >
          {/* Logo + Mode badge */}
          <Link href="/dashboard" className="flex items-center gap-1.5 shrink-0">
            {isGoldMode
              ? <Coins className="text-amber-500" size={18} />
              : <Activity className="text-blue-500" size={18} />
            }
            <span className={`font-bold text-sm sm:text-base tracking-tight ${isDark ? "text-white" : "text-[#0C1A2E]"}`}>
              TradeDesk
            </span>
            {isGoldMode && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                Gold
              </span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="td-desktop-nav items-center gap-0.5 min-w-0 overflow-x-auto">
            {PRIMARY_NAV.filter(({ key }) => !(isGoldMode && key === "nav.stocks")).map(({ href, key }) => (
              <Link key={href} href={href} className={navLinkCls(isActive(href, pathname))}>
                {t(key)}
              </Link>
            ))}

            {/* More button — dropdown renders outside nav to escape overflow clip */}
            <button
              ref={moreBtnRef}
              onClick={() => setMoreOpen(!moreOpen)}
              className={`px-2 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 active:scale-95 shrink-0 ${
                OVERFLOW_NAV.some((n) => isActive(n.href, pathname))
                  ? isDark ? "bg-gray-800 text-white shadow-sm" : "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                  : isDark ? "text-gray-400 hover:text-white hover:bg-gray-800/70"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
              aria-label="More navigation options"
            >
              <MoreHorizontal size={16} />
            </button>
          </nav>

          {/* More dropdown — fixed position so it escapes overflow:auto on nav */}
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setMoreOpen(false)} />
              <div
                className={`fixed z-[70] rounded-lg border shadow-lg py-1 min-w-[160px] animate-scale-in ${
                  isDark ? "bg-gray-900 border-gray-800" : "bg-white border-[#D8E4F4]"
                }`}
                style={{
                  top: moreBtnRef.current ? moreBtnRef.current.getBoundingClientRect().bottom + 4 : 48,
                  right: 16,
                }}
              >
                {OVERFLOW_NAV.map(({ href, key, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      isActive(href, pathname)
                        ? isDark ? "bg-gray-800 text-white" : "bg-blue-50 text-blue-700"
                        : isDark ? "text-gray-400 hover:text-white hover:bg-gray-800"
                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={15} />
                    {t(key)}
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={toggleLang}
              aria-label="Toggle language"
              className={`px-2 py-1.5 ${btnBase} ${btnCls} text-xs font-semibold tracking-wide`}
              style={{ fontFamily: lang === "ar" ? "inherit" : undefined }}
            >
              {lang === "en" ? "AR" : "EN"}
            </button>

            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className={`p-1.5 ${btnBase} ${btnCls}`}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

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
        <div id="main-content" className="td-content-pad">{children}</div>

        {/* ── Mobile bottom tab bar ───────────────────────── */}
        <div
          className={`td-mobile-nav ${isDark ? "border-t border-gray-800 bg-gray-950" : "bg-white border-t border-[#D8E4F4]"}`}
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
            boxShadow: !isDark ? "0 -2px 16px rgba(14,30,60,0.07)" : undefined,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {MOBILE_NAV_KEYS.filter(({ key }) => !(isGoldMode && key === "nav.stocks")).map(({ href, key, icon: Icon }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 font-medium transition-colors relative ${
                  active ? "text-blue-500" : isDark ? "text-gray-500" : "text-slate-400"
                }`}
                style={{ minWidth: 52, flex: "1 0 52px" }}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-500" />
                )}
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span style={{ fontSize: 11, lineHeight: 1.2, textAlign: "center", fontWeight: active ? 600 : 500 }}>
                  {t(key)}
                </span>
              </Link>
            );
          })}
        </div>

      </div>
    </>
  );
}

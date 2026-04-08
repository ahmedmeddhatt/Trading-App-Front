"use client";

import Link from "next/link";
import { LayoutDashboard, BarChart2, Briefcase, LineChart } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview",  icon: LayoutDashboard },
  { href: "/stocks",    label: "Stocks",    icon: BarChart2 },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/analytics", label: "Analytics", icon: LineChart },
];

export default function MobileNav({ active }: { active: string }) {
  return (
    <>
      <style>{`
        .td-mobile-nav-bar { display: none; }
        @media (max-width: 639px) {
          .td-mobile-nav-bar { display: flex; }
        }
      `}</style>
      <div
        className="td-mobile-nav-bar border-t border-gray-800 bg-gray-950"
        style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50 }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isAct = href === active;
          return (
            <Link
              key={href}
              href={href}
              style={{ flex: 1 }}
              className={`flex flex-col items-center justify-center gap-1 py-3 font-medium transition-colors ${
                isAct ? "text-blue-400" : "text-gray-500"
              }`}
            >
              <Icon size={28} strokeWidth={isAct ? 2.5 : 1.5} />
              <span style={{ fontSize: 13 }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

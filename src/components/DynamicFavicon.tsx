"use client";

import { useEffect } from "react";
import { useTradingModeStore } from "@/store/useTradingMode";

const STOCK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;

const GOLD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>`;

export default function DynamicFavicon() {
  const mode = useTradingModeStore((s) => s.mode);

  useEffect(() => {
    const svg = mode === "GOLD" ? GOLD_ICON : STOCK_ICON;
    const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;

    // Override all existing favicon links instead of removing them
    const existingLinks = document.querySelectorAll<HTMLLinkElement>(
      "link[rel='icon'], link[rel='shortcut icon']"
    );
    if (existingLinks.length > 0) {
      existingLinks.forEach((l) => {
        l.href = url;
      });
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.href = url;
      document.head.appendChild(link);
    }
  }, [mode]);

  return null;
}

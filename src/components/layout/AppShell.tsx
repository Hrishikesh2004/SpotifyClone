"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { PlayerBar } from "@/components/player/PlayerBar";
import { ToastProvider } from "@/context/ToastContext";

import { useEffect, type ReactNode } from "react";

const AUTH_PAGES = ["/login", "/signup"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  // lock body scroll on auth pages for app-like feel
  useEffect(() => {
    document.body.style.overflow = isAuthPage ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAuthPage]);

  if (isAuthPage) {
    return (
      <ToastProvider>
        <main className="h-full overflow-y-auto">{children}</main>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Sidebar />
      <div className="pb-40 md:pb-24 md:pl-60">
        <main className="min-h-[calc(100vh-10rem)]">{children}</main>
      </div>
      <MobileNav />
      <PlayerBar />
    </ToastProvider>
  );
}

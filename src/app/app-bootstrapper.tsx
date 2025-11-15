// src/app/app-bootstrapper.tsx
"use client";

import { usePathname } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import Chatbot from "@/components/input/chatbot";

// ====================================================================
// PASTIKAN NAMA IMPORT KEMBALI KE 'useAuth'
// ====================================================================
import { useAuth } from "@/lib/auth"; //
import { useEffect, useState } from "react";

/**
 * Komponen ini berada di dalam <Providers> dan aman memanggil hook
 * seperti useAuth() dan usePathname() untuk mengatur layout halaman.
 */
export default function AppBootstrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // --- 1. Panggil SEMUA hook di top-level ---
  const pathname = usePathname();
  // ====================================================================
  // PASTIKAN NAMA HOOK KEMBALI KE 'useAuth'
  // ====================================================================
  const { isAuthenticated, isLoading } = useAuth(); //
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- 2. Tentukan kondisi layout ---
  const isLogin = pathname.startsWith("/login");

  // Tampilkan loading jika:
  // - Belum client-side (mencegah hydration mismatch)
  // - Auth sedang loading
  // - Belum login TAPI tidak sedang di halaman login (menunggu redirect dari middleware)
  if (!isClient || isLoading || (!isAuthenticated && !isLogin)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        Loading...
      </div>
    );
  }

  // --- 3. Terapkan Layout Berdasarkan Kondisi ---

  // Jika di halaman login, render halaman (children) saja
  if (isLogin) {
    return <>{children}</>;
  }

  // Jika sudah lolos semua, user terautentikasi dan di halaman aplikasi
  // Maka, render AppShell lengkap
  return (
    <AppShell>
      {children}
      <Chatbot />
    </AppShell>
  );
}
// src/app/layout-client.tsx
"use client";

import "./globals.css";
import Providers from "./providers";
import AppBootstrapper from "./app-bootstrapper"; // <-- Impor komponen baru

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Komponen ini HANYA bertanggung jawab untuk <Providers>
  // 2. Semua hook (useAuth, usePathname) dipindahkan ke AppBootstrapper
  return (
    <Providers>
      {/* AppBootstrapper sekarang aman memanggil hook seperti useAuth() 
        karena sudah berada DI DALAM <Providers> 
      */}
      <AppBootstrapper>{children}</AppBootstrapper>
    </Providers>
  );
}

// "use client";

// import "./globals.css";
// import Providers from "./providers";
// import Chatbot from "@/components/input/chatbot";
// import AppShell from "@/components/layout/app-shell";

// export default function LayoutClient({ children }: { children: React.ReactNode }) {

//   return (
//     <Providers>
//       <AppShell>
//         {children}
//       </AppShell>
//       <Chatbot />
//     </Providers>
//   );
// } 

// "use client";

// import { useSearchParams } from "next/navigation";
// import "./globals.css";
// import Providers from "./providers";
// import Chatbot from "@/components/input/chatbot";
// import AppShell from "@/components/layout/app-shell";

// export default function LayoutClient({ children }: { children: React.ReactNode }) {

// const params = useSearchParams();
//   const isPdf = params.get("pdf") === "true";
//   return (
//     <>
//         {isPdf && children }
//             {!isPdf &&
//             <Providers>
//                     <AppShell>
//                         {children}
//                     </AppShell>
//                 <Chatbot />
//             </Providers>
//         }
//     </>
//   );
// }
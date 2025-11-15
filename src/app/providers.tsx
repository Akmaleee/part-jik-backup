// src/app/providers.tsx
"use client";

import { ApolloLink, HttpLink } from "@apollo/client";
import {
  ApolloNextAppProvider,
  NextSSRInMemoryCache,
  NextSSRApolloClient,
  SSRMultipartLink,
} from "@apollo/experimental-nextjs-app-support/ssr";

// ====================================================================
// 1. Impor AuthProvider (untuk memperbaiki error 'useAuth')
// ====================================================================
import { AuthProvider } from "@/lib/auth"; // [cite: akmaleee/part-jik-backup/part-jik-backup-5a3bdc9e6c3ac0dc52d979bd5c60b4ac5e0bd443/src/lib/auth.ts]

// Impor TooltipProvider (dari file Anda di riwayat sebelumnya)
import { TooltipProvider } from "@/components/ui/tooltip"; // [cite: akmaleee/part-jik-backup/part-jik-backup-5a3bdc9e6c3ac0dc52d979bd5c60b4ac5e0bd443/src/components/ui/tooltip.tsx]

// ====================================================================
// 2. Konfigurasi Apollo Client cara modern (memperbaiki error TS2339)
// ====================================================================
const uri = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ?? "/api/graphql";

function makeClient() {
  const httpLink = new HttpLink({
    uri: uri,
    // Menonaktifkan cache fetch di sisi server agar data selalu baru
    fetchOptions: { cache: "no-store" },
  });

  // Note: errorLink (onError) Anda dapat ditambahkan di sini jika diperlukan,
  // tapi setup SSR ini seringkali sudah cukup.
  // const errorLink = onError(...)
  // link: from([errorLink, httpLink])

  return new NextSSRApolloClient({
    cache: new NextSSRInMemoryCache(),
    link:
      typeof window === "undefined"
        ? ApolloLink.from([
            new SSRMultipartLink({
              stripDefer: true,
            }),
            httpLink,
          ])
        : httpLink,
  });
}

// Komponen wrapper baru untuk Apollo
function ApolloWrapper({ children }: React.PropsWithChildren) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}

// ====================================================================
// 3. Gabungkan semua provider
// ====================================================================
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider> {/* <-- Memperbaiki error useAuth */}
      <TooltipProvider>
        <ApolloWrapper> {/* <-- Memperbaiki error Apollo TS2339 */}
          {children}
        </ApolloWrapper>
      </TooltipProvider>
    </AuthProvider>
  );
}

// "use client";

// import { ApolloClient, InMemoryCache, HttpLink, from } from "@apollo/client";
// import { ApolloProvider } from "@apollo/client/react";
// import { onError } from "@apollo/client/link/error";

// const uri = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ?? "/api/graphql";

// const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
//   if (graphQLErrors) {
//     console.group(`[GraphQL errors] in ${operation.operationName || "op"}`);
//     for (const e of graphQLErrors) {
//       console.error(e.message, e.locations, e.path, e.extensions);
//     }
//     console.groupEnd();
//   }
//   if (networkError) {
//     console.error("[Network error]", networkError);
//   }
// });

// const httpLink = new HttpLink({ uri, fetch });

// const client = new ApolloClient({
//   link: from([errorLink, httpLink]),
//   cache: new InMemoryCache(),
// });

// export default function Providers({ children }: { children: React.ReactNode }) {
//   return <ApolloProvider client={client}>{children}</ApolloProvider>;
// }

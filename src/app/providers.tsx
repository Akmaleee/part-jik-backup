"use client";

import { ApolloClient, InMemoryCache, HttpLink, from } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { onError } from "@apollo/client/link/error";

const uri = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ?? "/api/graphql";

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    console.group(`[GraphQL errors] in ${operation.operationName || "op"}`);
    for (const e of graphQLErrors) {
      console.error(e.message, e.locations, e.path, e.extensions);
    }
    console.groupEnd();
  }
  if (networkError) {
    console.error("[Network error]", networkError);
  }
});

const httpLink = new HttpLink({ uri, fetch });

const client = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

import { createYoga } from "graphql-yoga";
import { schema } from "@/graphql/schema";

const yoga = createYoga({
  schema,
  graphqlEndpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || "/api/graphql",
  fetchAPI: { Response },
  maskedErrors: process.env.NODE_ENV === "production",
  graphiql: process.env.NODE_ENV !== "production",
});


export { yoga as GET, yoga as POST };

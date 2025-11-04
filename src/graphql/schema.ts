import { createSchema } from "graphql-yoga";
import { documentTypeDefs } from "./modules/postgres/typeDefs";
import { documentResolvers } from "./modules/postgres/resolvers";

export const schema = createSchema({
  typeDefs: [documentTypeDefs],
  resolvers: [documentResolvers],
});

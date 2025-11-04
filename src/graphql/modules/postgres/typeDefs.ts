export const documentTypeDefs = /* GraphQL */ `
  type Document {
    id: ID!
    companyName: String!
    jikTitle: String!
    unitName: String!
    initiativePartnership: String!
    investValue: String
    contractDurationYears: Int
    createdAt: String!
    updatedAt: String!
    deletedAt: String
  }

  input CreateDocumentInput {
    companyName: String!
    jikTitle: String!
    unitName: String!
    initiativePartnership: String!
    investValue: String
    contractDurationYears: Int
  }

  input UpdateDocumentInput {
    id: ID!
    companyName: String
    jikTitle: String
    unitName: String
    initiativePartnership: String
    investValue: String
    contractDurationYears: Int
  }

  type Query {
    documents(includeDeleted: Boolean = false): [Document!]!
    document(id: ID!): Document
  }

  type Mutation {
    createDocument(input: CreateDocumentInput!): Document!
    updateDocument(input: UpdateDocumentInput!): Document!
    softDeleteDocument(id: ID!): Boolean!
    restoreDocument(id: ID!): Boolean!
    hardDeleteDocument(id: ID!): Boolean!
  }
`;

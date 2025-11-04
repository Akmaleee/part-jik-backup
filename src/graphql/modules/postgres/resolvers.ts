import { prisma } from "@/lib/prisma/postgres";

export const documentResolvers = {
  Query: {
    documents: async (_: unknown, { includeDeleted }: { includeDeleted?: boolean }) =>
      prisma.document.findMany({
        where: includeDeleted ? {} : { deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    document: async (_: unknown, { id }: { id: string }) =>
      prisma.document.findUnique({ where: { id } }),
  },

  Mutation: {
    createDocument: async (_: unknown, { input }: any) =>
      prisma.document.create({
        data: {
          companyName: input.companyName,
          jikTitle: input.jikTitle,
          unitName: input.unitName,
          initiativePartnership: input.initiativePartnership,
          investValue: input.investValue ?? undefined,          // kirim string "123.45"
          contractDurationYears: input.contractDurationYears ?? undefined,
        },
      }),

    updateDocument: async (_: unknown, { input }: any) =>
      prisma.document.update({
        where: { id: input.id },
        data: {
          companyName: input.companyName ?? undefined,
          jikTitle: input.jikTitle ?? undefined,
          unitName: input.unitName ?? undefined,
          initiativePartnership: input.initiativePartnership ?? undefined,
          investValue: input.investValue ?? undefined,
          contractDurationYears: input.contractDurationYears ?? undefined,
        },
      }),

    softDeleteDocument: async (_: unknown, { id }: { id: string }) => {
      await prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
      return true;
    },
    restoreDocument: async (_: unknown, { id }: { id: string }) => {
      await prisma.document.update({ where: { id }, data: { deletedAt: null } });
      return true;
    },
    hardDeleteDocument: async (_: unknown, { id }: { id: string }) => {
      await prisma.document.delete({ where: { id } });
      return true;
    },
  },

  // --- Field resolvers untuk serialisasi yang aman ---
  Document: {
    investValue: (parent: any) =>
      parent.investValue != null ? parent.investValue.toString() : null,
    createdAt: (p: any) => (p.createdAt ? new Date(p.createdAt).toISOString() : null),
    updatedAt: (p: any) => (p.updatedAt ? new Date(p.updatedAt).toISOString() : null),
    deletedAt: (p: any) => (p.deletedAt ? new Date(p.deletedAt).toISOString() : null),
  },
};

// lib/mongo.ts
import mongoose, { Schema, model, models } from "mongoose";

const MONGODB_URI = process.env.DATABASE_URL_MONGO!;
const DB_NAME = process.env.MONGO_DB || "app";

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
}

const SectionSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: Schema.Types.Mixed, required: true }, // Tiptap JSONContent
  },
  { _id: false }
);

const DocumentContentSchema = new Schema(
  {
    documentId: { type: String, required: true, unique: true, index: true }, // UUID Postgres
    sections: { type: [SectionSchema], default: [] },
    version: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "document_contents" }
);

DocumentContentSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const DocumentContent =
  models.DocumentContent || model("DocumentContent", DocumentContentSchema);

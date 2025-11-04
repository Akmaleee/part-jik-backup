import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();
const BASE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL!;

/**
 * GET /api/chat
 * Mengambil semua data chat
 */
export async function GET() {
  try {
    const chats = await prisma.chat.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: chats });
  } catch (err) {
    console.error("GET /api/chat error:", err);
    return NextResponse.json({
      success: false,
      message: "Gagal mengambil data chat.",
    });
  }
}

/**
 * POST /api/chat
 * Membuat chat baru (pertama kali user mulai bertanya)
 * 🔹 Sekarang pakai FormData, bukan JSON
 */
export async function POST(req: Request) {
  try {
    // 🟢 Ambil form data dari frontend
    const formData = await req.formData();
    const question = formData.get("question") as string;
    const webSearch = formData.get("webSearch") as string;

    if (!question || question.trim() === "") {
      return NextResponse.json({
        success: false,
        message: "Pertanyaan tidak boleh kosong.",
      });
    }

    // 🔹 Potong sebagian pertanyaan jadi title
    const title =
      question.split(" ").slice(0, 10).join(" ") +
      (question.split(" ").length > 10 ? "..." : "");

    // 🔹 Buat data chat baru di Prisma
    const chat = await prisma.chat.create({
      data: {
        uuid: uuidv4(),
        title,
      },
    });

    // 🔹 Siapkan FormData untuk dikirim ke FastAPI
    const aiFormData = new FormData();
    aiFormData.append("query", question);
    if (webSearch === "true") {
      aiFormData.append("webSearch", "true");
    }

    // 🔹 Panggil FastAPI (pakai FormData)
    const aiResponse = await fetch(`${BASE_URL}/chat`, {
      method: "POST",
      body: aiFormData, // ❗ Tanpa headers JSON
    });

    const data = await aiResponse.json();
    const answer = data?.data.answer || "Tidak ada jawaban dari AI.";

    // 🔹 Simpan riwayat pertama di ChatHistory
    await prisma.chatHistory.create({
      data: {
        chatId: chat.id,
        question,
        answer,
      },
    });

    // 🔹 Kirim hasil ke frontend
    return NextResponse.json({
      success: true,
      message: "Chat berhasil dibuat.",
      data: {
        session_id: chat.uuid,
        title,
        answer,
      },
    });
  } catch (err) {
    console.error("POST /api/chat error:", err);
    return NextResponse.json({
      success: false,
      message: "Gagal membuat chat.",
    });
  }
}

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const BASE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL!;

/**
 * GET /api/chat/[uuid]
 * Ambil seluruh chat history berdasarkan UUID chat
 */
export async function GET(req: Request, context: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await context.params; // ✅ harus di-await
  try {
    const chat = await prisma.chat.findUnique({
      where: { uuid },
      include: {
        histories: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!chat) {
      return NextResponse.json({ success: false, message: 'Chat tidak ditemukan.' });
    }

    return NextResponse.json({ success: true, data: chat.histories });
  } catch (err) {
    console.error('GET /api/chat/[uuid] error:', err);
    return NextResponse.json({ success: false, message: 'Gagal mengambil riwayat chat.' });
  }
}

/**
 * POST /api/chat/[uuid]
 * Melanjutkan chat yang sudah ada (pakai FormData)
 */
export async function POST(req: Request, context: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await context.params; // ✅
  try {
    const formData = await req.formData();
    const question = formData.get('question') as string;
    const webSearch = formData.get('webSearch') as string;

    if (!question) {
      return NextResponse.json({ success: false, message: 'Pertanyaan tidak boleh kosong.' });
    }

    const chat = await prisma.chat.findUnique({ where: { uuid } });
    if (!chat) {
      return NextResponse.json({ success: false, message: 'Chat tidak ditemukan.' });
    }

    // Kirim ke FastAPI
    const aiFormData = new FormData();
    aiFormData.append('query', question);
    if (webSearch === 'true') {
      aiFormData.append('webSearch', 'true');
    }

    const aiResponse = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      body: aiFormData,
    });

    const data = await aiResponse.json();
    const answer = data?.data.answer || 'Tidak ada jawaban dari AI.';

    // Simpan ke DB
    await prisma.chatHistory.create({
      data: {
        chatId: chat.id,
        question,
        answer,
      },
    });

    return NextResponse.json({
      success: true,
      data: { answer },
    });
  } catch (err) {
    console.error('POST /api/chat/[uuid] error:', err);
    return NextResponse.json({ success: false, message: 'Gagal melanjutkan chat.' });
  }
}

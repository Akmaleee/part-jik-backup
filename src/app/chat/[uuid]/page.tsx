'use client';

import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { UserMenu } from '@/components/chat/UserMenu';
import clsx from 'clsx';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function ChatPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [tool, setTool] = useState('');

  const listRef = useRef<HTMLDivElement>(null);

  // 🔹 Scroll otomatis ke bawah
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  // 🔹 Ambil riwayat chat dari backend (GET /api/chat/[uuid])
  useEffect(() => {
    if (!uuid) return;
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/chat/${uuid}`);
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          const formatted: Msg[] = [];
          for (const item of data.data) {
            if (item.question) formatted.push({ role: 'user', content: item.question });
            if (item.answer) formatted.push({ role: 'assistant', content: item.answer });
          }
          setMessages(formatted);
        }
      } catch (err) {
        console.error('Gagal memuat riwayat chat:', err);
      }
    };
    loadHistory();
  }, [uuid]);

  // 🔹 Kirim pesan baru ke backend Next.js (pakai FormData)
  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setSending(true);

    try {
      // Siapkan FormData (karena backend pakai req.formData())
      const formData = new FormData();
      formData.append('question', text);
      if (tool === 'web-search') {
        formData.append('webSearch', 'true');
      }

      const apiUrl = `/api/chat/${uuid}`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data?.success) {
        const answer = data.data?.answer || 'Tidak ada jawaban dari AI.';
        setMessages((m) => [...m, { role: 'assistant', content: answer }]);
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: '❌ Gagal mengirim pesan.' }]);
      }
    } catch (err) {
      console.error('Error kirim pesan:', err);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: '⚠️ Terjadi kesalahan koneksi ke server.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <UserMenu />
      <div className="relative h-full min-h-0 flex flex-col overflow-hidden pt-10 md:pt-8">
        <section className="mx-auto w-full max-w-5xl flex-1 min-h-0 px-6 md:px-10 py-10">
          <div className="flex h-full min-h-0 flex-col">
            {/* Area Chat */}
            <div
              ref={listRef}
              className={clsx(
                'space-y-3 pr-4 md:pr-6 chat-scroll flex-1 overflow-y-auto'
              )}
            >
              {messages.map((m, i) => (
                <ChatBubble key={i} role={m.role}>
                  {m.content}
                </ChatBubble>
              ))}
              {sending && (
                <ChatBubble role="assistant" isTyping>
                  Mengetik…
                </ChatBubble>
              )}
            </div>

            {/* Input Box */}
            <div className="mt-4">
              <ChatInput
                onSend={handleSend}
                charLimit={2000}
                tools={[{ label: 'Web Search', value: 'web-search' }]}
                selectedTool={tool}
                onToolChange={setTool}
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

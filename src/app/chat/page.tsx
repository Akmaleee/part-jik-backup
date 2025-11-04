'use client';

import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { UserMenu } from '@/components/chat/UserMenu';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tool, setTool] = useState('');
  const hasUserMessage = messages.some((m) => m.role === 'user');
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/chat') {
      setMessages([]);
      setSessionId(null);
      setSending(false);
    }
  }, [pathname]);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  // 🔹 Handle pengiriman pesan
  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setSending(true);

    try {
      // 🔹 Jika belum ada session → buat chat baru (pakai FormData)
      if (!sessionId) {
        // Buat FormData untuk dikirim ke backend Next.js (/api/chat)
        const formData = new FormData();
        formData.append('question', text);
        if (tool === 'web-search') {
          formData.append('webSearch', 'true');
        }

        const apiUrl = `/api/chat`;
        const res = await fetch(apiUrl, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data?.success) {
          const sid = data.data.session_id as string;
          setSessionId(sid);
          setMessages((m) => [
            ...m,
            { role: 'assistant', content: data.data.answer },
          ]);

          // Update URL tanpa reload
          window.history.pushState({}, '', `/chat/${sid}`);
          window.dispatchEvent(
            new CustomEvent('chat-created', { detail: { id: sid, title: text } })
          );
          window.dispatchEvent(new Event('app-urlchange'));
        } else {
          setMessages((m) => [
            ...m,
            { role: 'assistant', content: '❌ Gagal membuat sesi baru.' },
          ]);
        }
      } else {
        // 🔹 Jika sudah ada session → lanjutkan (pakai JSON biasa ke /api/chat/[uuid])
        const res = await fetch(`/api/chat/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: text }),
        });

        const data = await res.json();
        if (data?.success) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: data.data.answer },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: '❌ Gagal mengirim pesan.' },
          ]);
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Error koneksi ke server.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <UserMenu />
      <div className="relative h-full min-h-0 flex flex-col overflow-hidden pt-10 md:pt-32">
        {!hasUserMessage && (
          <section className="px-6 md:px-10 mt-20">
            <div className="mx-auto max-w-5xl text-center">
              <p className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
                <span className="text-slate-800">How can I help you today</span>
                <span className="text-brand-500">?</span>
              </p>
            </div>
          </section>
        )}
        <section className="mx-auto w-full max-w-5xl flex-1 min-h-0 px-6 md:px-10 py-10">
          <div className="flex h-full min-h-0 flex-col">
            <div
              ref={listRef}
              className={clsx(
                'space-y-3 pr-4 md:pr-6 chat-scroll',
                hasUserMessage
                  ? 'flex-1 min-h-0 overflow-y-auto'
                  : 'max-h-[40vh]'
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

            <div className="shrink-0 mt-4">
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

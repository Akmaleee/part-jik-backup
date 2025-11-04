'use client';

import clsx from 'clsx';
import { MessageSquarePlus } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type Chat = { uuid: string; title: string };
type SidebarProps = { onNewChat?: () => void };

const PAGE_STEP = 15;

export function Sidebar({ onNewChat }: SidebarProps) {
  const [chatList, setChatList] = useState<Chat[]>([]);
  const [pageSize, setPageSize] = useState(PAGE_STEP);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const currentId = pathname.startsWith('/chat/') ? pathname.split('/').pop() || '' : '';
  const onRootChat = pathname === '/chat';
  const listRef = useRef<HTMLDivElement>(null);

  // 🔹 Ambil daftar chat dari API
  const fetchChatList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chat`);
      const data = await res.json();

      if (data?.success) {
        setChatList(data.data);
        setHasMore(data.data.length >= pageSize);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar chat:', err);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchChatList();
  }, [fetchChatList]);

  // 🔹 Infinite scroll (optional)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
      if (nearBottom && !loading && hasMore) {
        setPageSize((s) => s + PAGE_STEP);
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [loading, hasMore]);

  // 🔹 Event listener: update list jika ada chat baru
  useEffect(() => {
    const onCreated = (e: Event) => {
      const ce = e as CustomEvent<{ id: string; title: string }>;
      const { id, title } = ce.detail || { id: '', title: '' };
      if (!id) return;
      setChatList((prev) => [{ uuid: id, title: title || 'New chat' }, ...prev]);
    };
    window.addEventListener('chat-created', onCreated as EventListener);
    return () => window.removeEventListener('chat-created', onCreated as EventListener);
  }, []);

  // 🔹 Navigasi ke halaman chat
  const openChat = (id: string) => router.push(`/chat/${id}`);

  // 🔹 Buat chat baru
  const handleNewChatClick = () => {
    if (onRootChat) return;
    if (onNewChat) onNewChat();
    else router.push('/chat');
  };

  return (
    <aside
      className={clsx(
        'hidden md:flex h-screen w-64 shrink-0 flex-col border-r border-slate-300 bg-hero'
      )}
    >
      <nav className="p-3 space-y-2 shrink-0 pt-6">
        {/* Tombol chat baru */}
        <button
          type="button"
          onClick={handleNewChatClick}
          className={clsx(
            'group w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs border border-slate-200',
            'hover:bg-white/50 transition-colors cursor-pointer'
          )}
          title="New Chat"
        >
          <MessageSquarePlus className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
          <span className="truncate text-left">New Chat</span>
        </button>

        {/* Label History */}
        <div className="pt-2">
          <div className="px-1 text-[11px] uppercase tracking-wider text-slate-600/80">
            History
          </div>
        </div>
      </nav>

      {/* Daftar chat */}
      <div
        ref={listRef}
        className={clsx('flex-1 min-h-0 overflow-y-auto chat-scroll px-3 pb-3 space-y-1')}
      >
        {chatList.length === 0 && !loading ? (
          <div className="px-1 pt-1 text-xs text-slate-500/80">
            No conversations yet.
          </div>
        ) : (
          chatList.map((chat) => (
            <div
              key={chat.uuid}
              role="button"
              tabIndex={0}
              onClick={() => openChat(chat.uuid)}
              className={clsx(
                'group w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs',
                'hover:bg-white/50 transition-colors cursor-pointer',
                currentId === chat.uuid && 'bg-indigo-300'
              )}
            >
              <span className="block truncate text-left" title={chat.title}>
                {chat.title}
              </span>
            </div>
          ))
        )}

        {loading && (
          <div className="py-2 text-center text-[11px] text-slate-500/80">
            Loading…
          </div>
        )}
      </div>
    </aside>
  );
}

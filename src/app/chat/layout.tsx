'use client';

import { Sidebar } from '@/components/chat/Sidebar';
import { ReactNode } from 'react';

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-hero">
      <div className="grid h-full grid-cols-[16rem_1fr]">
        <Sidebar />
        <div className="relative min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

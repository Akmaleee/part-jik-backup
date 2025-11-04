import clsx from 'clsx';
import Image from 'next/image';

export function ChatBubble({
  role,
  children,
  isTyping,
}: {
  role: 'user' | 'assistant';
  children: React.ReactNode;
  isTyping?: boolean;
}) {
  const isUser = role === 'user';

  return (
    <div
      className={clsx(
        'flex w-full items-start',
        isUser ? 'justify-end' : 'justify-start gap-3'
      )}
    >
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="relative h-12 w-12 flex-shrink-0">
          {isTyping && (
            <div
              className="absolute inset-0 rounded-full animate-spin
                         border-2 border-transparent border-t-blue-600"
            ></div>
          )}

          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/logo_buble.png"
              alt="Assistant Logo"
              width={64}
              height={64}
              className={clsx(
                'rounded-full transition-all duration-300',
                isTyping ? 'h-8 w-8' : 'h-8 w-8'
              )}
            />
          </div>
        </div>
      )}

      {/* Bubble */}
      <div
        className={clsx(
          'max-w-[80%] rounded-2xl px-4 py-3 text-lg shadow-soft break-words',
          isUser
            ? 'bg-gradient-to-r from-[#53E0E7] to-[#7C3AFC] text-white rounded-br-sm'
            : 'bg-transparent text-slate-800 border-none rounded-bl-sm prose prose-sm max-w-none'
        )}
      >
        {isUser ? (
          children
        ) : (
          <div dangerouslySetInnerHTML={{ __html: children as string }} />
        )}
      </div>
    </div>
  );
}

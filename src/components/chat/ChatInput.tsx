'use client';
import { Send } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type ToolOption = { label: string; value: string };

type Props = {
  onSend: (text: string) => void;
  suggestions?: string[];
  charLimit?: number;
  placeholder?: string;
  tools?: ToolOption[];
  selectedTool?: string;
  onToolChange?: (value: string) => void;
};

export function ChatInput({
  onSend,
  charLimit = 2000,
  placeholder = 'Tanyakan apa saja… (Enter kirim • Shift+Enter baris baru)',
  tools = [],
  selectedTool = '',
  onToolChange,
}: Props) {
  const [value, setValue] = useState('');
  const [sel, setSel] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const MAX_HEIGHT = 192; // ~12rem

  const autoResize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    const next = Math.min(ta.scrollHeight, MAX_HEIGHT);
    ta.style.height = `${next}px`;
    ta.style.overflowY = ta.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  };

  useLayoutEffect(() => {
    autoResize();
  }, []);
  useEffect(() => {
    autoResize();
  }, [value]);

  const trimmed = value.trim();
  const overLimit = charLimit > 0 && value.length > charLimit;
  const canSend = trimmed.length > 0 && !overLimit;
  const remaining = charLimit > 0 ? Math.max(charLimit - value.length, 0) : undefined;

  const doSend = () => {
    if (!canSend) return;
    onSend(trimmed);
    setValue('');
    requestAnimationFrame(autoResize);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    const isEnter = e.key === 'Enter';
    const composing = isComposing || (e as any).nativeEvent?.isComposing;
    if (isEnter && !e.shiftKey && !composing) {
      e.preventDefault();
      if (!canSend) return;
      doSend();
    }
  };

  const applySuggestion = (v: string) => {
    setValue(v);
    setSel('');
    requestAnimationFrame(() => {
      taRef.current?.focus();
      const len = v.length;
      taRef.current?.setSelectionRange?.(len, len);
      autoResize();
    });
  };

  return (
    <div className="rounded-xl border border-slate-300 bg-white/80 backdrop-blur-lg transition duration-300 ease-in-out">
      {/* Textarea */}
      <div className="px-3 pt-3">
        <textarea
          ref={taRef}
          rows={1}
          aria-label="Bidang pesan"
          aria-multiline="true"
          aria-describedby={charLimit > 0 ? 'char-hint' : undefined}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            const next = charLimit > 0 ? e.target.value.slice(0, charLimit + 1) : e.target.value;
            setValue(next);
          }}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          className={[
            'block w-full bg-transparent text-sm placeholder:text-slate-400',
            'resize-none leading-6 max-h-48 overflow-y-hidden rounded-xl p-2',
            'outline-none focus:outline-none focus-visible:outline-none',
            'ring-0 focus:ring-0 focus-visible:ring-0',
            'shadow-none focus:shadow-none',
          ].join(' ')}
          style={{ lineHeight: '1.5', WebkitTapHighlightColor: 'transparent' as any }}
        />
      </div>

      {/* Toolbar */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Dropdown Tools */}
          {tools.length > 0 && onToolChange && (
            <select
              aria-label="tools"
              className="hidden sm:block max-w-[260px] truncate text-xs rounded-lg border border-slate-200 bg-white/90 backdrop-blur px-2 py-2 shadow-sm hover:bg-white"
              value={selectedTool}
              onChange={(e) => onToolChange(e.target.value)}
            >
              <option value="">Tools</option>
              {tools.map((tool) => (
                <option key={tool.value} value={tool.value} title={tool.label}>
                  {tool.label}
                </option>
              ))}
            </select>
          )}
          {charLimit > 0 && (
            <span
              id="char-hint"
              className={`text-[11px] ${overLimit ? 'text-red-600' : 'text-slate-500'}`}
              aria-live="polite"
            >
              {overLimit ? `Melebihi batas ${charLimit} karakter` : `${remaining} karakter tersisa`}
            </span>
          )}
        </div>

        <button
          onClick={doSend}
          disabled={!canSend}
          className="h-9 w-9 grid place-items-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          aria-label="Kirim"
          title="Kirim"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

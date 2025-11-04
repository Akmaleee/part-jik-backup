"use client";

import { useMemo, useReducer, useRef, useEffect } from "react";
import type { JSONContent } from "@tiptap/react";
import { FaPlus } from "react-icons/fa";
import RichTextInput from "@/components/input/rich-text-input";

// === tipe yang diekspor ke parent ===
export type ContentSection = { title: string; content: JSONContent };

// kalau mau simpan ke DB, bisa juga ubah menjadi:
// export type StoredSection = { id: string; title: string; content: string };

type Section = ContentSection;

const DEFAULT_TITLES = [
  "Latar Belakang Inisiatif Kemitraan",
  "Maksud dan Tujuan Inisiatif",
  "Ruang Lingkup dan Deskripsi Inisiatif Kemitraan",
  "Asumsi-asumsi yang digunakan",
  "Analisis bisnis, cost benefit, analisis finansial, dan analisis risiko beserta mitigasi risiko",
  "Gambaran hak dan kewajiban",
  "Pengungkapan atas kebijakan/proses bisnis yang dikesampingkan",
  "Rekomendasi Keputusan",
  "Keputusan",
] as const;

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

type Action =
  | { type: "add"; index: number; offset: -1 | 1 }
  | { type: "addEnd" }
  | { type: "remove"; index: number }
  | { type: "move"; index: number; dir: -1 | 1 }
  | { type: "update"; id: string; patch: Partial<Pick<Section, "title" | "content">> }
  | { type: "resetDefault" };

export default function ContentDocument({
  onChange,
}: {
  // ubah: parent sekarang terima JSON string
  onChange?: (sections: ContentSection[]) => void;
}) {
  const seq = useRef(0);
  const newId = () => `sec_${seq.current++}`;

  const initialSections = useMemo<Section[]>(
    () => DEFAULT_TITLES.map((t) => ({ id: newId(), title: t, content: EMPTY_DOC })),
    []
  );

  const reducer = (state: Section[], action: Action): Section[] => {
    switch (action.type) {
      case "add": {
        const idx = Math.max(
          0,
          Math.min(action.index + (action.offset === -1 ? 0 : 1), state.length)
        );
        const draft = [...state];
        draft.splice(idx, 0, { id: newId(), title: "Bagian Baru", content: EMPTY_DOC });
        return draft;
      }
      case "addEnd":
        return [...state, { id: newId(), title: "Bagian Baru", content: EMPTY_DOC }];
      case "remove":
        return state.length <= 1 ? state : state.filter((_, i) => i !== action.index);
      case "move": {
        const from = action.index;
        const to = from + action.dir;
        if (to < 0 || to >= state.length) return state;
        const draft = [...state];
        [draft[from], draft[to]] = [draft[to], draft[from]];
        return draft;
      }
      case "update":
        return state.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s));
      case "resetDefault":
        return DEFAULT_TITLES.map((t) => ({ id: newId(), title: t, content: EMPTY_DOC }));
      default:
        return state;
    }
  };

  const [sections, dispatch] = useReducer(reducer, initialSections);

  // 🔥 Emit hasil ke parent sebagai string JSON
  useEffect(() => {
    onChange?.(sections);
  }, [sections, onChange]);

  return (
    <>
      <Header onReset={() => dispatch({ type: "resetDefault" })} />

      <div className="divide-y">
        {sections.map((s, i) => (
          <RichTextInput
            key={s.id}
            className="py-6"
            index={i}
            total={sections.length}
            title={s.title}
            content={s.content}
            onTitle={(v) => dispatch({ type: "update", id: s.id, patch: { title: v } })}
            onContent={(v) => dispatch({ type: "update", id: s.id, patch: { content: v } })}
            onAddBefore={() => dispatch({ type: "add", index: i, offset: -1 })}
            onAddAfter={() => dispatch({ type: "add", index: i, offset: 1 })}
            onMoveUp={() => dispatch({ type: "move", index: i, dir: -1 })}
            onMoveDown={() => dispatch({ type: "move", index: i, dir: 1 })}
            onRemove={() => dispatch({ type: "remove", index: i })}
          />
        ))}
      </div>

      <div className="w-full flex items-center justify-center">
        <button
          onClick={() => dispatch({ type: "addEnd" })}
          aria-label="Tambah Section"
          className="flex items-center justify-center rounded-full border border-gray-300 p-2 hover:bg-gray-100 transition"
        >
          <FaPlus size={14} className="text-gray-600" />
        </button>
      </div>
    </>
  );
}

function Header({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h1 className="text-xl font-semibold mr-auto">Dokumen Inisiatif</h1>
      <button
        className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        onClick={onReset}
      >
        Reset ke Default
      </button>
    </div>
  );
}

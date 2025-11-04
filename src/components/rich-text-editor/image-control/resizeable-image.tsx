// components/rich-text-editor/extensions/ResizableImage.tsx
"use client";

import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import * as React from "react";

type HandleDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function ResizableImageView(props: any) {
  const { node, updateAttributes, selected, editor } = props;
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = React.useState(false);

  // width node → dipakai untuk wrapper agar handle nempel ke tepi gambar
  const widthAttr: string = node.attrs.width ?? "100%";

  const getContainerWidth = () => {
    const el = wrapRef.current?.parentElement; // block container terdekat
    return el ? el.clientWidth : (editor?.view.dom as HTMLElement)?.clientWidth ?? 1;
  };

  const startResize = (e: React.MouseEvent, dir: HandleDir) => {
    e.preventDefault();
    e.stopPropagation();

    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const origin = {
      x: e.clientX,
      y: e.clientY,
      w: rect.width,
      h: rect.height,
      cw: getContainerWidth(),
    };

    setDragging(true);

    const onMove = (ev: MouseEvent) => {
      let dx = ev.clientX - origin.x;
      let dy = ev.clientY - origin.y;

      // hitung width baru (px)
      let newWidthPx = origin.w;
      if (dir.includes("e")) newWidthPx = origin.w + dx;
      if (dir.includes("w")) newWidthPx = origin.w - dx;

      // clamp ke container
      newWidthPx = clamp(newWidthPx, 24, origin.cw);

      // optional tinggi: jaga rasio kecuali Alt ditekan
      const keepRatio = !ev.altKey;
      let newHeightPx = origin.h;
      if (dir.length === 2 || dir === "n" || dir === "s") {
        newHeightPx = keepRatio ? (newWidthPx / origin.w) * origin.h
                                : clamp(dir === "s" ? origin.h + dy : origin.h - dy, 24, 100000);
      }

      // ubah ke %
      const newPct = clamp((newWidthPx / origin.cw) * 100, 5, 100);
      // snap opsional ke kelipatan 5% (aktifkan jika mau)
      // const snapped = Math.round(newPct / 5) * 5;

      updateAttributes({ width: `${newPct.toFixed(2)}%` });
    };

    const onUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <NodeViewWrapper
      ref={wrapRef}
      className={`ri-wrap ${selected ? "is-selected" : ""} ${dragging ? "is-resizing" : ""}`}
      contentEditable={false}
      style={{
        // KUNCI: wrapper mengikuti width node
        width: widthAttr,
        maxWidth: "100%",
        display: "inline-block",
        position: "relative",
        margin: "1rem 0",
        lineHeight: 0,
        boxSizing: "content-box",
      }}
    >
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt || ""}
        title={node.attrs.title || ""}
        style={{
          // gambar isi wrapper
          width: "100%",
          height: node.attrs.height ?? "auto",
          display: "block",
          maxWidth: "100%",
          margin: 0,
          userSelect: "none",
          pointerEvents: dragging ? "none" : "auto",
        }}
        draggable
        onDragStart={(e) => dragging && e.preventDefault()}
      />

      {/* render handle hanya saat node terpilih */}
      {selected && (
        <>
          <span className="ri-h ri-h-nw" onMouseDown={(e) => startResize(e, "nw")} />
          <span className="ri-h ri-h-n"  onMouseDown={(e) => startResize(e, "n")} />
          <span className="ri-h ri-h-ne" onMouseDown={(e) => startResize(e, "ne")} />
          <span className="ri-h ri-h-e"  onMouseDown={(e) => startResize(e, "e")} />
          <span className="ri-h ri-h-se" onMouseDown={(e) => startResize(e, "se")} />
          <span className="ri-h ri-h-s"  onMouseDown={(e) => startResize(e, "s")} />
          <span className="ri-h ri-h-sw" onMouseDown={(e) => startResize(e, "sw")} />
          <span className="ri-h ri-h-w"  onMouseDown={(e) => startResize(e, "w")} />
        </>
      )}
    </NodeViewWrapper>
  );
}

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null, // simpan string seperti "62.5%"
        parseHTML: (el: HTMLElement) => el.style.width || el.getAttribute("width") || null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.width ? { style: `width:${attrs.width};` } : {},
      },
      height: {
        default: null, // tidak wajib; dipakai jika kamu ingin height tetap
        parseHTML: (el: HTMLElement) => el.style.height || el.getAttribute("height") || null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.height ? { style: `height:${attrs.height};` } : {},
      },
      draggable: { default: true },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

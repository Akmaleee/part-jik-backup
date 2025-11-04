"use client";

import type { Editor } from "@tiptap/react";

// PUT pakai XHR biar bisa progress (fetch gak bisa progress upload)
function xhrPut(url: string, file: File, onProgress?: (ratio01: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      onProgress?.(e.loaded / e.total);
    };

    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`PUT ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("PUT network error"));
    xhr.onabort = () => reject(new Error("PUT aborted"));

    xhr.send(file);
  });
}

// Presign helper
async function presign(file: File) {
  const ext = file.name.split(".").pop();
  const r = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mime: file.type, ext, size: file.size }),
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(`Presign failed: ${msg || r.status}`);
  }
  return (await r.json()) as { uploadUrl: string; publicUrl: string; key: string };
}

export function useImageUpload(editor: Editor | null) {
  const state = { uploading: false, progress: 0 };

  async function uploadFile(file: File, mode: "insert" | "replace" = "insert") {
    if (!editor) return;

    // 1) presign
    const { uploadUrl, publicUrl } = await presign(file);

    // 2) PUT ke MinIO (progress)
    state.uploading = true;
    state.progress = 0;
    await xhrPut(uploadUrl, file, (p) => (state.progress = p));
    state.uploading = false;

    // 3) sisipkan ke editor
    if (mode === "insert") {
      editor.chain().focus().setImage({ src: publicUrl }).run();
    } else {
      editor.chain().focus().updateAttributes("image", { src: publicUrl }).run();
    }

    return publicUrl;
  }

  async function insertFile(file: File) {
    return uploadFile(file, "insert");
  }

  async function replaceFile(file: File) {
    return uploadFile(file, "replace");
  }

  async function insertFromUrl(url: string) {
    editor?.chain().focus().setImage({ src: url }).run();
  }

  return {
    insertFile,
    replaceFile,
    insertFromUrl,
    // read-only snapshot; kalau mau reactive, bungkus ke useState/useRef sesuai kebutuhan UI
    get uploading() {
      return state.uploading;
    },
    get progress() {
      return state.progress;
    },
  };
}

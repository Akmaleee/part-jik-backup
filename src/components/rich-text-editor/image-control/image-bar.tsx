"use client";

import type { Editor } from "@tiptap/react";
import {
  Image as ImageIcon,
  Upload as UploadIcon,
  Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight,
  Maximize2, Minimize2, Trash2, RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useRef } from "react";
import { useImageUpload } from "@/hooks/useImageUpload";

export default function ImageBar({ editor }: { editor: Editor | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploader = useImageUpload(editor);

  if (!editor) return null;

  // --- helpers selection/image ---
  const isImgSelected = () => {
    const sel = (editor.state.selection as any);
    return sel?.node?.type?.name === "image";
  };

  const getImgAttrs = (): { src: string; width?: string } | null => {
    const sel = (editor.state.selection as any);
    return sel?.node?.type?.name === "image" ? (sel.node.attrs as any) : null;
  };

  const setWidth = (w?: string) => {
    if (!isImgSelected()) return;
    editor.chain().focus().updateAttributes("image", { width: w ?? null }).run();
  };

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await uploader.insertFile(file);
    } finally {
      input.value = ""; // allow re-pick same file
    }
  };

  const insertFromUrl = async () => {
    const url = window.prompt("Image URL");
    if (!url) return;
    await uploader.insertFromUrl(url);
  };

  const replaceImage = async () => {
    if (!isImgSelected()) {
      onPickFile(); // fallback: kalau tidak ada yang terseleksi, jadikan insert
      return;
    }
    const f = await pickOneFile();
    if (!f) return;
    await uploader.replaceFile(f);
  };

  const deleteImage = () => {
    if (!isImgSelected()) return;
    editor.chain().focus().deleteSelection().run();
  };

  const currentWidth = getImgAttrs()?.width ?? "auto";
  const isLeft   = editor.isActive({ textAlign: "left" });
  const isCenter = editor.isActive({ textAlign: "center" });
  const isRight  = editor.isActive({ textAlign: "right" });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Toggle size="sm" className="inline-flex items-center gap-1" title="Insert/Manage image">
            <ImageIcon className="size-4" />
            {/* (opsional) status upload */}
            {/* {uploader.uploading && <span className="ml-2 text-xs">{Math.round(uploader.progress*100)}%</span>} */}
          </Toggle>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" sideOffset={6} className="w-64">
          <DropdownMenuLabel>Insert</DropdownMenuLabel>
          <DropdownMenuItem onClick={onPickFile} className="flex items-center gap-2">
            <UploadIcon className="size-4" /> Upload from device
          </DropdownMenuItem>
          <DropdownMenuItem onClick={insertFromUrl} className="flex items-center gap-2">
            <LinkIcon className="size-4" /> Insert from URL
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Align</DropdownMenuLabel>
          <div className="px-2 py-1.5 flex items-center gap-1">
            <Button
              variant={isLeft ? "default" : "outline"}
              size="icon"
              title="Align left"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft className="size-4" />
            </Button>
            <Button
              variant={isCenter ? "default" : "outline"}
              size="icon"
              title="Align center"
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              <AlignCenter className="size-4" />
            </Button>
            <Button
              variant={isRight ? "default" : "outline"}
              size="icon"
              title="Align right"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight className="size-4" />
            </Button>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Resize</DropdownMenuLabel>
          <div className="px-2 py-1.5 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setWidth("25%")}>25%</Button>
            <Button variant="outline" size="sm" onClick={() => setWidth("50%")}>50%</Button>
            <Button variant="outline" size="sm" onClick={() => setWidth("75%")}>75%</Button>
            <Button variant="outline" size="sm" onClick={() => setWidth("100%")}>100%</Button>
          </div>
          <div className="px-2 pb-2 text-xs text-slate-500">
            current: <strong>{currentWidth}</strong>
          </div>
          <DropdownMenuItem onClick={() => setWidth(undefined)} className="flex items-center gap-2">
            <Minimize2 className="size-4" /> Reset size
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWidth("100%")} className="flex items-center gap-2">
            <Maximize2 className="size-4" /> Fit container
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Selected image</DropdownMenuLabel>
          <DropdownMenuItem onClick={replaceImage} className="flex items-center gap-2">
            <RefreshCw className="size-4" /> Replace image
          </DropdownMenuItem>
          <DropdownMenuItem onClick={deleteImage} className="flex items-center gap-2 text-red-600 focus:text-red-700">
            <Trash2 className="size-4" /> Delete image
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
    </>
  );
}

/* ==== utils ==== */
function pickOneFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

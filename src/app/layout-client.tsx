"use client";

import { useSearchParams } from "next/navigation";
import "./globals.css";
import Providers from "./providers";
import Chatbot from "@/components/input/chatbot";
import AppShell from "@/components/layout/app-shell";

export default function LayoutClient({ children }: { children: React.ReactNode }) {

const params = useSearchParams();
  const isPdf = params.get("pdf") === "true";
  return (
    <>
        {isPdf && children }
            {!isPdf &&
            <Providers>
                    <AppShell>
                        {children}
                    </AppShell>
                <Chatbot />
            </Providers>
        }
    </>
  );
}
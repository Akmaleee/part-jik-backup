import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Chatbot from "@/components/input/chatbot";
import AppShell from "@/components/layout/app-shell";
import LayoutClient from "./layout-client";

export const metadata: Metadata = {
  title: {
    default: "Partnership",
    template: "%s | Partnership",
  },
  description: "Website Partnership",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
       <LayoutClient>
          {children}
        </LayoutClient>
      </body>
    </html>
  );
}

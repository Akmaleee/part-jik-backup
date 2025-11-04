"use client";

import { saveAs } from "file-saver";
import htmlDocx from "html-docx-js-typescript";
import ReactDOMServer from "react-dom/server";

// Import semua komponenmu
import MomHeader from "./header-section";
import MomDescription from "./description-section";
import MomAttachmentSection from "./attachment-section";
import MomFooter from "./footer-section";

export async function generateDocx() {
  // Render semua React component ke HTML string
  const html = ReactDOMServer.renderToString(
    <>
      <MomHeader />
      <MomDescription />
      <MomAttachmentSection />
      <MomFooter />
    </>
  );

  const response = await fetch("/output.css");
  if (!response.ok) {
    console.error("Gagal mengambil Tailwind CSS:", response.status);
    return;
  }
  const tailwindCSS = await response.text();

  // Bungkus HTML lengkap
  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          ${tailwindCSS}
        </style>
      </head>
      <body>
        <div class="page">
          ${html}
        </div>
      </body>
    </html>
  `;

  console.log(fullHtml);
  // Konversi HTML ke blob DOCX
  const blob = await htmlDocx.asBlob(fullHtml);

  // Simpan / download file
  saveAs(blob, "MOM-Telkomsat-LEN.docx");
}

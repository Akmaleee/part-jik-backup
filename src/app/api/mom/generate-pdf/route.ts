import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { renderMomHeaderHTML } from "@/components/mom/render-header";

export async function GET() {
  const headerHTML = renderMomHeaderHTML(); // now plain string

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/test?pdf=true", { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: headerHTML,
    footerTemplate: "<div></div>",
    margin: { top: "150px", bottom: "80px" },
  });

  await browser.close();

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="page.pdf"',
    },
  });
}

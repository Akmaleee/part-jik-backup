// utils/exportPdf.js
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export const exportToPdf = async (elementId) => {
  const input = document.getElementById(elementId);

  // 🔧 temporarily replace CSS variables that use lab/oklch
  const html = document.documentElement;
  html.classList.add("pdf-safe");

  await new Promise((resolve) => setTimeout(resolve, 100)); // wait 1 frame

  const canvas = await html2canvas(input, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  html.classList.remove("pdf-safe"); // revert to normal mode

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save("document.pdf");
};

"use client";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function PdfGenerator() {
  const generatePDF = () => {
    const doc = new jsPDF({
      unit: "pt",
      format: "letter", // 8.5x11 inch = 612x792 pt
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 612

    // === Margins (Letter spec)
    const marginLeft = 90;
    const marginRight = 45;
    const headerY = 36; // Y awal untuk header table
    const footerY = 792 - 36;

    // !!! PENTING: GANTI DENGAN BASE64 LOGO ASLI ANDA !!!
    // Ganti placeholder 1x1 pixel hitam ini dengan string Base64 logo Anda
    const telkomLogoBase64 =
      "data:image/jpeg;base64,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"; // Placeholder Telkom/LEN
    const defendIdLogoBase64 =
      "data:image/jpeg;base64,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"; // Placeholder DEFEND ID/LEN


    // === Data untuk header table (kita akan menggunakan row/cell yang tepat untuk layout)
    const headerBody = [
        // Baris 1: Logo & Title Bar
        [
            // Col 0: Logo Kiri
            { content: "", styles: { minCellHeight: 45 } },
            // Col 1: Title
            {
                content: "MINUTE OF MEETING\nJoint Planning Session Telkomsat & LEN",
                styles: {
                    fontStyle: "bold",
                    fontSize: 10,
                    textColor: [255, 255, 255],
                    valign: "middle",
                    cellPadding: 5,
                    lineHeightFactor: 1.5,
                }
            },
            // Col 2: Logo Kanan
            { content: "", styles: { minCellHeight: 45 } },
        ],
        // Baris 2 - 4: Date, Time, Venue
        [
            { content: "Date", styles: { halign: "left", fontStyle: "normal", cellPadding: 2 } },
            { content: ": 23 September 2025", styles: { halign: "left", fontStyle: "normal", cellPadding: 2 } },
            ""
        ],
        [
            { content: "Time", styles: { halign: "left", fontStyle: "normal", cellPadding: 2 } },
            { content: ": 09.00 - 14.00", styles: { halign: "left", fontStyle: "normal", cellPadding: 2 } },
            ""
        ],
        [
            { content: "Venue", styles: { halign: "left", fontStyle: "normal", cellPadding: 2 } },
            { content: ": RR 1B Telkomsat", styles: { halign: "left", fontStyle: "normal", cellPadding: 2 } },
            ""
        ],
    ];

    // === Fungsi header dengan template tabel
    const addHeader = (doc: jsPDF) => {
      autoTable(doc, {
        startY: headerY,
        head: [],
        body: headerBody,
        theme: "plain", // Gunakan 'plain'
        styles: {
          fontSize: 9,
          cellPadding: 0,
        },
        margin: { left: marginLeft, right: marginRight },
        // Lebar Kolom: Logo (110pt), Judul/Detail (Auto/Sisa), Logo (110pt)
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 'auto' }, // Kolom 1 akan mengambil sisa ruang
          2: { cellWidth: 110 },
        },
        didDrawCell: (data) => {
          const { row, column, cell, table } = data;
          const doc = table.doc as jsPDF;

          // ** PERBAIKAN KRITIS: Pastikan 'doc' terdefinisi sebelum digunakan. **
          if (!doc) return;


          // === Logika untuk Baris 1 (Header Gelap) ===
          if (row.index === 0) {
            const tableWidth = pageWidth - marginLeft - marginRight;
            const darkBgColor = [50, 50, 50]; // Warna latar belakang gelap
            const lineColor = [100, 100, 100]; // Warna garis pemisah

            // 1. Gambar Latar Belakang Gelap (Meliputi Semua 3 Kolom)
            if (column.index === 0) { // Hanya perlu menggambar sekali, di kolom pertama
                doc.setFillColor(...darkBgColor);
                doc.rect(cell.x, cell.y, tableWidth, cell.height, "F");
            }

            // 2. Gambar Garis Pemisah Vertikal
            doc.setDrawColor(...lineColor);
            doc.setLineWidth(0.5);
            // Garis antara Col 0 dan Col 1
            if (column.index === 0) {
              doc.line(cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height);
            }
            // Garis antara Col 1 dan Col 2
            if (column.index === 1) {
              doc.line(cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height);
            }

            // 3. Tambahkan Logo
            const logoSideMargin = 10;
            const logoWidth = cell.width - (2 * logoSideMargin);
            const logoHeight = cell.height - 10; // 5pt top/bottom padding

            // Logo Kiri (Col 0)
            if (column.index === 0) {
              doc.addImage(
                telkomLogoBase64,
                "PNG",
                cell.x + logoSideMargin,
                cell.y + 5, // 5pt top padding
                logoWidth,
                logoHeight
              );
            }
            // Logo Kanan (Col 2)
            if (column.index === 2) {
              doc.addImage(
                defendIdLogoBase64,
                "PNG",
                cell.x + logoSideMargin,
                cell.y + 5, // 5pt top padding
                logoWidth,
                logoHeight
              );
            }
          }

          // === Logika untuk Baris 2-4 (Date, Time, Venue) ===
          if (row.index >= 1) {
            doc.setDrawColor(0, 0, 0); // Garis hitam
            doc.setLineWidth(0.5);
            const detailSectionWidth = table.columns[0].width + table.columns[1].width;
            
            // 1. Gambar Batas (Border)
            // Batas Kiri (di Col 0)
            if (column.index === 0) {
              doc.line(cell.x, cell.y, cell.x, cell.y + cell.height);
            }

            // Batas Kanan (di Col 1)
            if (column.index === 1) {
              doc.line(cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height);
            }

            // Batas Atas (Hanya di Baris 2)
            if (row.index === 1) {
                if(column.index < 2) {
                    doc.line(cell.x, cell.y, cell.x + detailSectionWidth, cell.y);
                }
            }

            // Batas Bawah (Hanya di Baris 4)
            if (row.index === 4) {
                if(column.index < 2) {
                    doc.line(cell.x, cell.y + cell.height, cell.x + detailSectionWidth, cell.y + cell.height);
                }
                // Jika ingin garis bawah ini sedikit lebih tebal atau beda warna, bisa diatur di sini
            }

            // ** PERBAIKAN: Tambah garis vertikal pemisah antara Kolom 0 dan Kolom 1 **
            if (column.index === 0 && row.index >= 1 && row.index <= 4) {
              // Gambar garis vertikal di sisi kanan kolom 0
              doc.line(cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height);
            }
          }
        },
      });

      const finalY = doc.lastAutoTable.finalY;

      // Garis pemisah di bawah header
      doc.setLineWidth(0.3);
      const lineY = finalY + 10;
      doc.line(marginLeft, lineY, pageWidth - marginRight, lineY);

      return lineY + 10; // posisi Y terakhir untuk konten
    };

    // ... (Fungsi addFooter tetap sama) ...
    const addFooter = (doc: jsPDF, pageNum: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Page ${pageNum}`, pageWidth - marginRight, footerY, {
        align: "right",
      });
      doc.text("Form Report: AUD-2025-001", marginLeft, footerY);
    };

    // === Pembuatan PDF ===
    let y = addHeader(doc);

    // === Konten halaman (dummy)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lorem =
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla ut arcu ut sapien dignissim suscipit. Sed vitae tincidunt ligula. Maecenas gravida neque nec sapien consequat, a aliquet purus tincidunt. ".repeat(
        10
      );
    const lines = doc.splitTextToSize(lorem, pageWidth - marginLeft - marginRight);

    // tulis isi konten
    doc.text(lines, marginLeft, y);

    addFooter(doc, 1);

    // === Tambahkan halaman kedua
    doc.addPage();
    y = addHeader(doc);
    doc.text(lines, marginLeft, y);
    addFooter(doc, 2);

    doc.save("Header_MOM_Final_With_Inner_Lines.pdf");
  };

  return (
    <div className="p-8">
      <button
        onClick={generatePDF}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Generate PDF (Header Final with Inner Lines)
      </button>
    </div>
  );
}
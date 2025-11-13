// src/app/api/jik/generate-docx/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres";
import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
} from "docx";
// Impor 'Approver' juga
import { Jik, JikApprover, Approver } from "@prisma/client"; 

// --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
async function fetchImage(url: string): Promise<Buffer | undefined> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
            return undefined;
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        console.error("Error fetching image:", error);
        return undefined;
    }
}

function sanitizeFileName(name: string): string {
    if (!name) return "";
    return name.trim().replace(/[\\/:*?"<>|]/g, '_');
}

// --- Style Border ---
const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// Menggunakan .NIL untuk memastikan border benar-benar hilang
const noBorder: IBorderOptions = { style: BorderStyle.NIL, size: 0, color: "auto" };
const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// Definisi ini menghilangkan border luar (top, bottom, left, right) dan dalam (insideH, insideV)
const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };


// --- Cell Margins ---
const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
const numberingConfig = {
    config: [
        {
            reference: "my-bullet-points",
            levels: [
                {
                    level: 0,
                    format: "bullet" as const,
                    text: "\u2022",
                    alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 720, hanging: 360 } } },
                },
            ],
        },
        {
            reference: "my-ordered-list",
            levels: [
                {
                    level: 0,
                    format: "decimal" as const,
                    text: "%1.",
                    alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 720, hanging: 360 } } },
                },
            ],
        },
    ],
};

// --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
interface TiptapNode {
    type: string;
    content?: TiptapNode[];
    text?: string;
    marks?: { type: string }[];
    attrs?: { src?: string; align?: 'left' | 'center' | 'right' | 'justify'; [key: string]: any }; 
}

async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
    const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
        const textRuns: TextRun[] = [];
        if (content) {
            for (const child of content) {
                if (child.type === 'text' && child.text) {
                    textRuns.push(new TextRun({
                        text: child.text || "",
                        bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
                        italics: child.marks?.some(m => m.type === 'italic'),
                    }));
                }
            }
        }
        // Jika tidak ada text run, kembalikan satu text run kosong
        return textRuns.length === 0 ? [new TextRun("")] : textRuns;
    };

    // --- Gunakan AlignmentType.BOTH ---
    const getAlignment = (
        alignAttr?: 'left' | 'center' | 'right' | 'justify'
    ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
        if (alignAttr === 'center') return AlignmentType.CENTER;
        if (alignAttr === 'right') return AlignmentType.RIGHT;
        if (alignAttr === 'left') return AlignmentType.LEFT;
        // Pustaka docx menggunakan 'BOTH' untuk 'justify'
        if (alignAttr === 'justify') return AlignmentType.BOTH; 
        
        // Default ke 'BOTH' (justify)
        return AlignmentType.BOTH; 
    };
    // --- AKHIR PERBAIKAN ---

    switch (node.type) {
        case 'paragraph':
            const runs = createTextRuns(node.content);
            return new Paragraph({ 
                children: runs,
                alignment: getAlignment(node.attrs?.align), // Ini sekarang akan default ke justify
            });

        case 'bulletList':
        case 'orderedList':
            const listItems: Paragraph[] = [];
            if (node.content) {
                for (const listItemNode of node.content) { 
                    if (listItemNode.type === 'listItem' && listItemNode.content) {
                        for (const itemContent of listItemNode.content) {
                            if (itemContent.type === 'paragraph') {
                                listItems.push(new Paragraph({
                                    children: createTextRuns(itemContent.content),
                                    numbering: {
                                        reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
                                        level: 0,
                                    },
                                    alignment: getAlignment(itemContent.attrs?.align), // Ini juga akan default ke justify
                                }));
                            }
                        }
                    }
                }
            }
            return listItems;

        case 'image':
            if (node.attrs?.src) {
                const imgBuffer = await fetchImage(node.attrs.src);
                if (imgBuffer) {
                    return new Paragraph({
                        children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
                        alignment: getAlignment(node.attrs?.align), // Image alignment tetap menghormati setting
                    });
                }
            }
            return undefined;

        case 'table':
            const tableRows: TableRow[] = [];
            if (node.content) { 
                for (const rowNode of node.content) { 
                    if (rowNode.type === 'tableRow' && rowNode.content) { 
                        const cells: TableCell[] = [];
                        for (const cellNode of rowNode.content) {
                            if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
                                const isHeader = cellNode.type === 'tableHeader';
                                const cellParagraphs: Paragraph[] = [];
                                if (cellNode.content) {
                                    for (const cellContentNode of cellNode.content) {
                                        const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
                                        if (docxElement) {
                                            if (Array.isArray(docxElement)) {
                                                cellParagraphs.push(...docxElement);
                                            } else if (docxElement instanceof Paragraph) {
                                                cellParagraphs.push(docxElement);
                                            }
                                        }
                                    }
                                }
                                cells.push(new TableCell({
                                    children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
                                    borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
                                    verticalAlign: VerticalAlign.CENTER,
                                    margins: cellMargins,
                                    shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
                                }));
                            }
                        }
                        tableRows.push(new TableRow({ children: cells }));
                    }
                }
            }
            return new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: tableRows,
                alignment: getAlignment(node.attrs?.align), // Alignment tabel
            });

        default:
            if (node.content) {
                return new Paragraph({ children: createTextRuns(node.content) });
            }
            return new Paragraph({ children: [new TextRun("")] });
    }
}


async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
    const tableRows: TableRow[] = [];
    if (!Array.isArray(sections)) { return tableRows; }
    
    let i = 0;
    for (const section of sections) {
        
        // --- CELL 1: NOMOR ---
        const noCell = new TableCell({
             children: [new Paragraph({ 
                text: (i + 1).toString(),
                alignment: AlignmentType.CENTER,
            })],
            borders: fullThinBorder, 
            margins: cellMargins,
            verticalAlign: VerticalAlign.TOP, 
        });

        // --- CELL 2: LABEL (DIUBAH KE .title) ---
        const labelCell = new TableCell({
            children: [new Paragraph({ 
                text: section.title || "", // <-- Menggunakan .title
            })],
            borders: fullThinBorder, 
            margins: cellMargins,
            verticalAlign: VerticalAlign.TOP, 
        });

        // --- CELL 3: CONTENT ---
        const contentChildren: (Paragraph | Table)[] = [];
        const tiptapJson = section.content as TiptapNode;
        
        // Cek apakah kontennya ada dan merupakan Tiptap doc
        if (tiptapJson && tiptapJson.type === 'doc' && Array.isArray(tiptapJson.content)) {
            for (const node of tiptapJson.content) {
                // Periksa apakah node paragraf kosong
                if (node.type === 'paragraph' && (!node.content || node.content.length === 0)) {
                    continue; // Lewati paragraf kosong
                }

                const docxElement = await nodeToDocx(node);
                if (docxElement) {
                    if (Array.isArray(docxElement)) {
                        contentChildren.push(...docxElement);
                    } else {
                        contentChildren.push(docxElement);
                    }
                }
            }
        } 
        
        // Jika setelah parsing tidak ada elemen (atau jika datanya kosong), 
        // pastikan kita tetap memasukkan 1 paragraf kosong agar selnya tidak kolaps
        if (contentChildren.length === 0) {
            contentChildren.push(new Paragraph(""));
        }
        
        const contentCell = new TableCell({
            children: contentChildren,
            borders: fullThinBorder, 
            margins: cellMargins,
        });

        // --- Buat Baris (Sekarang 3 sel) ---
        tableRows.push(new TableRow({
            children: [noCell, labelCell, contentCell]
        }));

        i++; // Increment nomor
    }
    return tableRows;
}
// --- AKHIR PARSER TIPTAP ---


// Definisikan tipe data yang akan kita gunakan
// Ini adalah JikApprover yang di-include dengan data Approver
type JikApproverWithApprover = JikApprover & {
    approver: Approver;
};


// --- PARSER APPROVER JIK (BARU) ---
function createJikApproverTable(approvers: JikApproverWithApprover[]): Table {
    // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
    const grouped: { [key: string]: JikApproverWithApprover[] } = { 
        Inisiator: [],
        Pemeriksa: [],
        'Pemberi Persetujuan': [],
    };

    approvers.forEach(appr => {
        const type = appr.approver_type; 
        if (type && (type === 'Inisiator' || type === 'Pemeriksa' || type === 'Pemberi Persetujuan')) {
            grouped[type].push(appr);
        }
    });

    // Buat baris header (Sekarang 5 kolom)
    const headerRow = new TableRow({
        children: [
            // Kolom 1: Header dikosongkan 
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
            // Kolom 2: Jabatan
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
            // Kolom 3: Nama
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
            // Kolom 4: Tanda Tangan
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
            // Kolom 5: Catatan
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
        ],
    });

    const rows: TableRow[] = [headerRow];

    // Fungsi untuk membuat baris data (Sekarang 5 kolom)
    const createDataRows = (type: string, list: JikApproverWithApprover[]) => {
        if (list.length === 0) {
            // Jika tidak ada data, buat 1 baris kosong (5 sel)
            rows.push(new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Jabatan kosong
                    new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Nama kosong
                    new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel TTD kosong
                    new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Catatan kosong
                ]
            }));
            return;
        }

        list.forEach((appr, index) => {

            // Buat array paragraf untuk Nama dan NIK
            const nameParagraphs: Paragraph[] = [
                new Paragraph(appr.approver.name || "") // Selalu tambahkan nama
            ];
            
            // Cek jika NIK ada, tambahkan sebagai paragraf kedua
            if (appr.approver.nik) {
                nameParagraphs.push(new Paragraph(appr.approver.nik));
            }

            rows.push(new TableRow({
                children: [
                    // Kolom 1: Tipe (Inisiator, dll)
                    new TableCell({ 
                        children: [new Paragraph(index === 0 ? type : "")], 
                        verticalMerge: index === 0 ? "restart" : "continue",
                        borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
                    }),
                    // Kolom 2: Jabatan
                    new TableCell({ children: [new Paragraph(appr.approver.jabatan || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
                    
                    // Kolom 3: Nama (dan NIK)
                    new TableCell({ 
                        children: nameParagraphs, // <-- Menggunakan array yang baru dibuat
                        borders: fullThinBorder, 
                        margins: cellMargins, 
                        verticalAlign: VerticalAlign.CENTER 
                    }),

                    // Kolom 4: TTD (Kosong)
                    new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
                    // Kolom 5: Catatan (Kosong)
                    new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
                ]
            }));
        });
    };

    // Buat baris untuk setiap grup
    createDataRows("Inisiator", grouped.Inisiator);
    createDataRows("Pemeriksa", grouped.Pemeriksa);
    createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows,
        // Sesuaikan lebar 5 kolom (misalnya: 15% + 25% + 25% + 15% + 20% = 100%)
        columnWidths: [15, 25, 25, 15, 20], 
    });
}
// --- AKHIR PARSER APPROVER JIK ---

// --- HELPER UNTUK INFO JIK (BARU) ---
function createJikInfoTable(jikData: Jik): Table {
    // Fungsi helper untuk membuat baris Key-Value
    const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
        const valText = value ? String(value) : "";
        
        const valuePrefix = key === "Contract Duration" ? "" : ": ";
        const valueSuffix = key === "Contract Duration" && valText ? `: ${valText} Tahun` : valText;
        const displayText = key === "Contract Duration" ? valueSuffix : `${valuePrefix}${valueSuffix}`;

        return new TableRow({
            children: [
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
                    borders: fullNoBorder, 
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    margins: cellMargins,
                    verticalAlign: VerticalAlign.TOP,
                }),
                // --- PERBAIKAN: Tambahkan alignment: AlignmentType.BOTH ---
                new TableCell({
                    children: [new Paragraph({
                        text: displayText,
                        alignment: AlignmentType.BOTH // <-- Rata kiri-kanan
                    })],
                    borders: fullNoBorder, 
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    margins: cellMargins,
                    verticalAlign: VerticalAlign.TOP,
                }),
                // --- AKHIR PERBAIKAN ---
            ],
        });
    };

    const rows: TableRow[] = [
        createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), 
        createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
        createInfoRow("Investment Value", jikData.invest_value),
        createInfoRow("Contract Duration", jikData.contract_duration_years),
    ];

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows,
        columnWidths: [4000, 5500],
        borders: fullNoBorder, 
    });
}
// --- AKHIR HELPER INFO JIK ---


// --- API ROUTE UTAMA (JIK) ---
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const jikId = body.jikId; // Ubah dari momId ke jikId

        if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

        // Ambil data JIK dari database
        const jikData = await prisma.jik.findUnique({
            where: { id: parseInt(jikId as string) },
            // Lakukan nested include untuk 'approver'
            include: {
                company: true, 
                jik_approvers: {
                    include: {
                        approver: true // <-- Ini akan mengambil data 'name', 'jabatan', dan 'nik'
                    }
                }
            },
        });

        if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

        // 1. Buat Tabel Lembar Pengesahan
        const approverTable = createJikApproverTable(jikData.jik_approvers);

        // 2. Buat Tabel Info JIK (Key-Value)
        const infoTable = createJikInfoTable(jikData);

        // 3. Parse Konten Tiptap (document_initiative) 
        const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

        // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
        
        // --- BUAT HEADER ROW BARU ---
        const mainContentHeaderRow = new TableRow({
            children: [
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true })], alignment: AlignmentType.CENTER })],
                    borders: fullThinBorder,
                    margins: cellMargins,
                    shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
                    width: { size: 5, type: WidthType.PERCENTAGE }, // Kolom No kecil
                }),
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })], alignment: AlignmentType.CENTER })],
                    borders: fullThinBorder,
                    margins: cellMargins,
                    shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
                    width: { size: 35, type: WidthType.PERCENTAGE }, // Kolom Label
                }),
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "KETERANGAN", bold: true })], alignment: AlignmentType.CENTER })],
                    borders: fullThinBorder,
                    margins: cellMargins,
                    shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
                    width: { size: 60, type: WidthType.PERCENTAGE }, // Kolom Isi
                }),
            ]
        });

        const mainContentTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            // Lebar 3 kolom
            columnWidths: [500, 4000, 5000], 
            rows: [
                mainContentHeaderRow, // Header
                ...parsedContentTableRows, // Isi
            ]
        });


        // --- Gabungkan Semua Elemen di Dokumen ---
        const doc = new Document({
            numbering: numberingConfig, // Pakai ulang config numbering
            sections: [{
                // JIK tidak memiliki header berulang seperti MOM
                headers: { default: new Header({ children: [] }) }, // Header kosong
                
                // Footer (Boleh pakai ulang)
                footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
                
                properties: {
                    page: {
                        margin: {
                            top: 1440, 
                            right: 1440,
                            bottom: 1440,
                            left: 1440,
                        }
                    }
                },

                // Urutan anak-anak dokumen
                children: [
                    // 1. Judul Halaman - LEMBAR PENGESAHAN (DIUBAH WARNANYA)
                    new Paragraph({
                        children: [new TextRun({ text: "LEMBAR PENGESAHAN", color: "000000" })], // <-- TAMBAH COLOR HITAM
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 }
                    }),
                    
                    // 2. Tabel Approver
                    approverTable,
                    new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

                    // 3. Judul Dokumen - DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK) (DIUBAH WARNANYA)
                    new Paragraph({
                        children: [new TextRun({ text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)", color: "000000" })], // <-- TAMBAH COLOR HITAM
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        pageBreakBefore: true, 
                    }),
                    
                    // Sub-judul - FILE JIK 3 (DIUBAH WARNANYA)
                    new Paragraph({
                        children: [new TextRun({ text: jikData.judul.toUpperCase(), color: "000000" })], // <-- TAMBAH COLOR HITAM
                        heading: HeadingLevel.HEADING_2,
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: `No: ${jikData.no || 'xxx'}`, color: "000000" })], // <-- TAMBAH COLOR HITAM
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 300 }
                    }),

                    // 4. Tabel Info JIK (Key-Value)
                    infoTable, 
                    new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

                    // 5. Tabel Konten Tiptap 
                    mainContentTable, 

                ],
            }],
        });

        // --- Packing dan Kirim ---
        const buffer = await Packer.toBuffer(doc);
        const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
        const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
        const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

        // Gunakan 'Uint8Array'
        return new NextResponse(Uint8Array.from(buffer), {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="${fileName}"`,
            },
        });

    } catch (error: any) {
        console.error("Error generating JIK DOCX:", error);
        return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
    }
}

// // src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//     Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// // Impor 'Approver' juga
// import { Jik, JikApprover, Approver } from "@prisma/client"; 

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// // Menggunakan .NIL untuk memastikan border benar-benar hilang
// const noBorder: IBorderOptions = { style: BorderStyle.NIL, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// // Definisi ini menghilangkan border luar (top, bottom, left, right) dan dalam (insideH, insideV)
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// interface TiptapNode {
//     type: string;
//     content?: TiptapNode[];
//     text?: string;
//     marks?: { type: string }[];
//     attrs?: { src?: string; align?: 'left' | 'center' | 'right' | 'justify'; [key: string]: any }; // <-- Perbarui tipe di sini
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         // Jika tidak ada text run, kembalikan satu text run kosong
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     // --- PERBAIKAN: Gunakan AlignmentType.BOTH ---
//     const getAlignment = (
//         alignAttr?: 'left' | 'center' | 'right' | 'justify'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         if (alignAttr === 'left') return AlignmentType.LEFT;
//         // Pustaka docx menggunakan 'BOTH' untuk 'justify'
//         if (alignAttr === 'justify') return AlignmentType.BOTH; 
        
//         // Default ke 'BOTH' (justify)
//         return AlignmentType.BOTH; 
//     };
//     // --- AKHIR PERBAIKAN ---

//     switch (node.type) {
//         case 'paragraph':
//             const runs = createTextRuns(node.content);
//             return new Paragraph({ 
//                 children: runs,
//                 alignment: getAlignment(node.attrs?.align), // Ini sekarang akan default ke justify
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align), // Ini juga akan default ke justify
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align), // Image alignment tetap menghormati setting
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align), // Alignment tabel
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }


// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     let i = 0;
//     for (const section of sections) {
        
//         // --- CELL 1: NOMOR ---
//         const noCell = new TableCell({
//              children: [new Paragraph({ 
//                 text: (i + 1).toString(),
//                 alignment: AlignmentType.CENTER,
//             })],
//             borders: fullThinBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 2: LABEL (DIUBAH KE .title) ---
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 text: section.title || "", // <-- Menggunakan .title
//             })],
//             borders: fullThinBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 3: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
        
//         // Cek apakah kontennya ada dan merupakan Tiptap doc
//         if (tiptapJson && tiptapJson.type === 'doc' && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 // Periksa apakah node paragraf kosong
//                 if (node.type === 'paragraph' && (!node.content || node.content.length === 0)) {
//                     continue; // Lewati paragraf kosong
//                 }

//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } 
        
//         // Jika setelah parsing tidak ada elemen (atau jika datanya kosong), 
//         // pastikan kita tetap memasukkan 1 paragraf kosong agar selnya tidak kolaps
//         if (contentChildren.length === 0) {
//             contentChildren.push(new Paragraph(""));
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren,
//             borders: fullThinBorder, 
//             margins: cellMargins,
//         });

//         // --- Buat Baris (Sekarang 3 sel) ---
//         tableRows.push(new TableRow({
//             children: [noCell, labelCell, contentCell]
//         }));

//         i++; // Increment nomor
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---


// // Definisikan tipe data yang akan kita gunakan
// // Ini adalah JikApprover yang di-include dengan data Approver
// type JikApproverWithApprover = JikApprover & {
//     approver: Approver;
// };


// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApproverWithApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApproverWithApprover[] } = { 
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         const type = appr.approver_type; 
//         if (type && (type === 'Inisiator' || type === 'Pemeriksa' || type === 'Pemberi Persetujuan')) {
//             grouped[type].push(appr);
//         }
//     });

//     // Buat baris header (Sekarang 5 kolom)
//     const headerRow = new TableRow({
//         children: [
//             // Kolom 1: Header dikosongkan 
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 2: Jabatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 3: Nama
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 4: Tanda Tangan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 5: Catatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data (Sekarang 5 kolom)
//     const createDataRows = (type: string, list: JikApproverWithApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong (5 sel)
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Jabatan kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Nama kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel TTD kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Catatan kosong
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {

//             // Buat array paragraf untuk Nama dan NIK
//             const nameParagraphs: Paragraph[] = [
//                 new Paragraph(appr.approver.name || "") // Selalu tambahkan nama
//             ];
            
//             // Cek jika NIK ada, tambahkan sebagai paragraf kedua
//             if (appr.approver.nik) {
//                 nameParagraphs.push(new Paragraph(appr.approver.nik));
//             }

//             rows.push(new TableRow({
//                 children: [
//                     // Kolom 1: Tipe (Inisiator, dll)
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom 2: Jabatan
//                     new TableCell({ children: [new Paragraph(appr.approver.jabatan || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
                    
//                     // Kolom 3: Nama (dan NIK)
//                     new TableCell({ 
//                         children: nameParagraphs, // <-- Menggunakan array yang baru dibuat
//                         borders: fullThinBorder, 
//                         margins: cellMargins, 
//                         verticalAlign: VerticalAlign.CENTER 
//                     }),

//                     // Kolom 4: TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom 5: Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         // Sesuaikan lebar 5 kolom (misalnya: 15% + 25% + 25% + 15% + 20% = 100%)
//         columnWidths: [15, 25, 25, 15, 20], 
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
        
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" && valText ? `: ${valText} Tahun` : valText;
//         const displayText = key === "Contract Duration" ? valueSuffix : `${valuePrefix}${valueSuffix}`;

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: fullNoBorder, 
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph(displayText)],
//                     borders: fullNoBorder, 
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), 
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", jikData.contract_duration_years),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, 
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//     try {
//         const body = await req.json();
//         const jikId = body.jikId; // Ubah dari momId ke jikId

//         if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//         // Ambil data JIK dari database
//         const jikData = await prisma.jik.findUnique({
//             where: { id: parseInt(jikId as string) },
//             // Lakukan nested include untuk 'approver'
//             include: {
//                 company: true, 
//                 jik_approvers: {
//                     include: {
//                         approver: true // <-- Ini akan mengambil data 'name', 'jabatan', dan 'nik'
//                     }
//                 }
//             },
//         });

//         if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//         // 1. Buat Tabel Lembar Pengesahan
//         const approverTable = createJikApproverTable(jikData.jik_approvers);

//         // 2. Buat Tabel Info JIK (Key-Value)
//         const infoTable = createJikInfoTable(jikData);

//         // 3. Parse Konten Tiptap (document_initiative) 
//         const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//         // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
        
//         // --- BUAT HEADER ROW BARU ---
//         const mainContentHeaderRow = new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true })], alignment: AlignmentType.CENTER })],
//                     borders: fullThinBorder,
//                     margins: cellMargins,
//                     shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                     width: { size: 5, type: WidthType.PERCENTAGE }, // Kolom No kecil
//                 }),
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })], alignment: AlignmentType.CENTER })],
//                     borders: fullThinBorder,
//                     margins: cellMargins,
//                     shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                     width: { size: 35, type: WidthType.PERCENTAGE }, // Kolom Label
//                 }),
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: "KETERANGAN", bold: true })], alignment: AlignmentType.CENTER })],
//                     borders: fullThinBorder,
//                     margins: cellMargins,
//                     shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                     width: { size: 60, type: WidthType.PERCENTAGE }, // Kolom Isi
//                 }),
//             ]
//         });

//         const mainContentTable = new Table({
//             width: { size: 100, type: WidthType.PERCENTAGE },
//             // Lebar 3 kolom
//             columnWidths: [500, 4000, 5000], 
//             rows: [
//                 mainContentHeaderRow, // Header
//                 ...parsedContentTableRows, // Isi
//             ]
//         });


//         // --- Gabungkan Semua Elemen di Dokumen ---
//         const doc = new Document({
//             numbering: numberingConfig, // Pakai ulang config numbering
//             sections: [{
//                 // JIK tidak memiliki header berulang seperti MOM
//                 headers: { default: new Header({ children: [] }) }, // Header kosong
                
//                 // Footer (Boleh pakai ulang)
//                 footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
                
//                 properties: {
//                     page: {
//                         margin: {
//                             top: 1440, 
//                             right: 1440,
//                             bottom: 1440,
//                             left: 1440,
//                         }
//                     }
//                 },

//                 // Urutan anak-anak dokumen
//                 children: [
//                     // 1. Judul Halaman - LEMBAR PENGESAHAN (DIUBAH WARNANYA)
//                     new Paragraph({
//                         children: [new TextRun({ text: "LEMBAR PENGESAHAN", color: "000000" })], // <-- TAMBAH COLOR HITAM
//                         heading: HeadingLevel.HEADING_1,
//                         alignment: AlignmentType.CENTER,
//                         spacing: { after: 200 }
//                     }),
                    
//                     // 2. Tabel Approver
//                     approverTable,
//                     new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//                     // 3. Judul Dokumen - DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK) (DIUBAH WARNANYA)
//                     new Paragraph({
//                         children: [new TextRun({ text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)", color: "000000" })], // <-- TAMBAH COLOR HITAM
//                         heading: HeadingLevel.HEADING_1,
//                         alignment: AlignmentType.CENTER,
//                         pageBreakBefore: true, 
//                     }),
                    
//                     // Sub-judul - FILE JIK 3 (DIUBAH WARNANYA)
//                     new Paragraph({
//                         children: [new TextRun({ text: jikData.judul.toUpperCase(), color: "000000" })], // <-- TAMBAH COLOR HITAM
//                         heading: HeadingLevel.HEADING_2,
//                         alignment: AlignmentType.CENTER,
//                     }),
//                     new Paragraph({
//                         children: [new TextRun({ text: `No: ${jikData.no || 'xxx'}`, color: "000000" })], // <-- TAMBAH COLOR HITAM
//                         alignment: AlignmentType.CENTER,
//                         spacing: { after: 300 }
//                     }),

//                     // 4. Tabel Info JIK (Key-Value)
//                     infoTable, 
//                     new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//                     // 5. Tabel Konten Tiptap 
//                     mainContentTable, 

//                 ],
//             }],
//         });

//         // --- Packing dan Kirim ---
//         const buffer = await Packer.toBuffer(doc);
//         const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//         const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//         const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//         // --- PERBAIKAN: Gunakan 'Uint8Array' bukan 'UintArray' ---
//         return new NextResponse(Uint8Array.from(buffer), {
//             status: 200,
//             headers: {
//                 "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//                 "Content-Disposition": `attachment; filename="${fileName}"`,
//             },
//         });

//     } catch (error: any) {
//         console.error("Error generating JIK DOCX:", error);
//         return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//     }
// }

// // src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//     Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// // Impor 'Approver' juga
// import { Jik, JikApprover, Approver } from "@prisma/client"; 

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// // Menggunakan .NIL untuk memastikan border benar-benar hilang
// const noBorder: IBorderOptions = { style: BorderStyle.NIL, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// // Definisi ini menghilangkan border luar (top, bottom, left, right) dan dalam (insideH, insideV)
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// interface TiptapNode {
//     type: string;
//     content?: TiptapNode[];
//     text?: string;
//     marks?: { type: string }[];
//     attrs?: { src?: string; align?: 'left' | 'center' | 'right'; [key: string]: any };
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         // Jika tidak ada text run, kembalikan satu text run kosong
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//         alignAttr?: 'left' | 'center' | 'right'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         return AlignmentType.LEFT;
//     };

//     switch (node.type) {
//         case 'paragraph':
//             const runs = createTextRuns(node.content);
//             return new Paragraph({ 
//                 children: runs,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }


// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     let i = 0;
//     for (const section of sections) {
        
//         // --- CELL 1: NOMOR ---
//         const noCell = new TableCell({
//              children: [new Paragraph({ 
//                 text: (i + 1).toString(),
//                 alignment: AlignmentType.CENTER,
//             })],
//             borders: fullThinBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 2: LABEL (DIUBAH KE .title) ---
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 text: section.title || "", // <-- Menggunakan .title
//             })],
//             borders: fullThinBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 3: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
        
//         // Cek apakah kontennya ada dan merupakan Tiptap doc
//         if (tiptapJson && tiptapJson.type === 'doc' && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 // Periksa apakah node paragraf kosong
//                 if (node.type === 'paragraph' && (!node.content || node.content.length === 0)) {
//                     continue; // Lewati paragraf kosong
//                 }

//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } 
        
//         // Jika setelah parsing tidak ada elemen (atau jika datanya kosong), 
//         // pastikan kita tetap memasukkan 1 paragraf kosong agar selnya tidak kolaps
//         if (contentChildren.length === 0) {
//             contentChildren.push(new Paragraph(""));
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren,
//             borders: fullThinBorder, 
//             margins: cellMargins,
//         });

//         // --- Buat Baris (Sekarang 3 sel) ---
//         tableRows.push(new TableRow({
//             children: [noCell, labelCell, contentCell]
//         }));

//         i++; // Increment nomor
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---


// // Definisikan tipe data yang akan kita gunakan
// // Ini adalah JikApprover yang di-include dengan data Approver
// type JikApproverWithApprover = JikApprover & {
//     approver: Approver;
// };


// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApproverWithApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApproverWithApprover[] } = { 
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         const type = appr.approver_type; 
//         if (type && (type === 'Inisiator' || type === 'Pemeriksa' || type === 'Pemberi Persetujuan')) {
//             grouped[type].push(appr);
//         }
//     });

//     // Buat baris header (Sekarang 5 kolom)
//     const headerRow = new TableRow({
//         children: [
//             // Kolom 1: Header dikosongkan 
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 2: Jabatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 3: Nama
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 4: Tanda Tangan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 5: Catatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data (Sekarang 5 kolom)
//     const createDataRows = (type: string, list: JikApproverWithApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong (5 sel)
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Jabatan kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Nama kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel TTD kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Catatan kosong
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {

//             // --- PERBAIKAN: Buat array paragraf untuk Nama dan NIK ---
//             const nameParagraphs: Paragraph[] = [
//                 new Paragraph(appr.approver.name || "") // Selalu tambahkan nama
//             ];
            
//             // Cek jika NIK ada, tambahkan sebagai paragraf kedua
//             if (appr.approver.nik) {
//                 nameParagraphs.push(new Paragraph(appr.approver.nik));
//             }
//             // --- AKHIR PERBAIKAN ---

//             rows.push(new TableRow({
//                 children: [
//                     // Kolom 1: Tipe (Inisiator, dll)
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom 2: Jabatan
//                     new TableCell({ children: [new Paragraph(appr.approver.jabatan || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
                    
//                     // --- PERBAIKAN: Gunakan array paragraf di sini ---
//                     // Kolom 3: Nama (dan NIK)
//                     new TableCell({ 
//                         children: nameParagraphs, // <-- Menggunakan array yang baru dibuat
//                         borders: fullThinBorder, 
//                         margins: cellMargins, 
//                         verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // --- AKHIR PERBAIKAN ---

//                     // Kolom 4: TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom 5: Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         // Sesuaikan lebar 5 kolom (misalnya: 15% + 25% + 25% + 15% + 20% = 100%)
//         columnWidths: [15, 25, 25, 15, 20], 
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
        
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" && valText ? `: ${valText} Tahun` : valText;
//         const displayText = key === "Contract Duration" ? valueSuffix : `${valuePrefix}${valueSuffix}`;

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: fullNoBorder, 
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph(displayText)],
//                     borders: fullNoBorder, 
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), 
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", jikData.contract_duration_years),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, 
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//     try {
//         const body = await req.json();
//         const jikId = body.jikId; // Ubah dari momId ke jikId

//         if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//         // Ambil data JIK dari database
//         const jikData = await prisma.jik.findUnique({
//             where: { id: parseInt(jikId as string) },
//             // Lakukan nested include untuk 'approver'
//             include: {
//                 company: true, 
//                 jik_approvers: {
//                     include: {
//                         approver: true // <-- Ini akan mengambil data 'name', 'jabatan', dan 'nik'
//                     }
//                 }
//             },
//         });

//         if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//         // 1. Buat Tabel Lembar Pengesahan
//         const approverTable = createJikApproverTable(jikData.jik_approvers);

//         // 2. Buat Tabel Info JIK (Key-Value)
//         const infoTable = createJikInfoTable(jikData);

//         // 3. Parse Konten Tiptap (document_initiative) 
//         const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//         // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
        
//         // --- BUAT HEADER ROW BARU ---
//         const mainContentHeaderRow = new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true })], alignment: AlignmentType.CENTER })],
//                     borders: fullThinBorder,
//                     margins: cellMargins,
//                     shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                     width: { size: 5, type: WidthType.PERCENTAGE }, // Kolom No kecil
//                 }),
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })], alignment: AlignmentType.CENTER })],
//                     borders: fullThinBorder,
//                     margins: cellMargins,
//                     shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                     width: { size: 35, type: WidthType.PERCENTAGE }, // Kolom Label
//                 }),
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: "KETERANGAN", bold: true })], alignment: AlignmentType.CENTER })],
//                     borders: fullThinBorder,
//                     margins: cellMargins,
//                     shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                     width: { size: 60, type: WidthType.PERCENTAGE }, // Kolom Isi
//                 }),
//             ]
//         });

//         const mainContentTable = new Table({
//             width: { size: 100, type: WidthType.PERCENTAGE },
//             // Lebar 3 kolom
//             columnWidths: [500, 4000, 5000], 
//             rows: [
//                 mainContentHeaderRow, // Header
//                 ...parsedContentTableRows, // Isi
//             ]
//         });


//         // --- Gabungkan Semua Elemen di Dokumen ---
//         const doc = new Document({
//             numbering: numberingConfig, // Pakai ulang config numbering
//             sections: [{
//                 // JIK tidak memiliki header berulang seperti MOM
//                 headers: { default: new Header({ children: [] }) }, // Header kosong
                
//                 // Footer (Boleh pakai ulang)
//                 footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
                
//                 properties: {
//                     page: {
//                         margin: {
//                             top: 1440, 
//                             right: 1440,
//                             bottom: 1440,
//                             left: 1440,
//                         }
//                     }
//                 },

//                 // Urutan anak-anak dokumen
//                 children: [
//                     // 1. Judul Halaman - LEMBAR PENGESAHAN (DIUBAH WARNANYA)
//                     new Paragraph({
//                         children: [new TextRun({ text: "LEMBAR PENGESAHAN", color: "000000" })], // <-- TAMBAH COLOR HITAM
//                         heading: HeadingLevel.HEADING_1,
//                         alignment: AlignmentType.CENTER,
//                         spacing: { after: 200 }
//                     }),
                    
//                     // 2. Tabel Approver
//                     approverTable,
//                     new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//                     // 3. Judul Dokumen - DOKUMEN JUSTIFIKASI INISIATIF KEMITRAan (JIK) (DIUBAH WARNANYA)
//                     new Paragraph({
//                         children: [new TextRun({ text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)", color: "000000" })], // <-- TAMBAH COLOR HITAM
//                         heading: HeadingLevel.HEADING_1,
//                         alignment: AlignmentType.CENTER,
//                         pageBreakBefore: true, 
//                     }),
                    
//                     // Sub-judul - FILE JIK 3 (DIUBAH WARNANYA)
//                     new Paragraph({
//                         children: [new TextRun({ text: jikData.judul.toUpperCase(), color: "000000" })], // <-- TAMBAH COLOR HITAM
//                         heading: HeadingLevel.HEADING_2,
//                         alignment: AlignmentType.CENTER,
//                     }),
//                     new Paragraph({
//                         children: [new TextRun({ text: `No: ${jikData.no || 'xxx'}`, color: "000000" })], // <-- TAMBAH COLOR HITAM
//                         alignment: AlignmentType.CENTER,
//                         spacing: { after: 300 }
//                     }),

//                     // 4. Tabel Info JIK (Key-Value)
//                     infoTable, 
//                     new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//                     // 5. Tabel Konten Tiptap 
//                     mainContentTable, 

//                 ],
//             }],
//         });

//         // --- Packing dan Kirim ---
//         const buffer = await Packer.toBuffer(doc);
//         const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//         const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//         const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//         return new NextResponse(Uint8Array.from(buffer), {
//             status: 200,
//             headers: {
//                 "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//                 "Content-Disposition": `attachment; filename="${fileName}"`,
//             },
//         });

//     } catch (error: any) {
//         console.error("Error generating JIK DOCX:", error);
//         return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//     }
// }



// // File: src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//     Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// import { Jik, JikApprover } from "@prisma/client"; // Import tipe data

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// // Menggunakan .NIL untuk memastikan border benar-benar hilang
// const noBorder: IBorderOptions = { style: BorderStyle.NIL, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// // Definisi ini menghilangkan border luar (top, bottom, left, right) dan dalam (insideH, insideV)
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// interface TiptapNode {
//   type: string;
//   content?: TiptapNode[];
//   text?: string;
//   marks?: { type: string }[];
//   attrs?: { src?: string; align?: 'left' | 'center' | 'right'; [key: string]: any };
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         // Jika tidak ada text run, kembalikan satu text run kosong
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//       alignAttr?: 'left' | 'center' | 'right'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         return AlignmentType.LEFT;
//     };

//     switch (node.type) {
//         case 'paragraph':
//             const runs = createTextRuns(node.content);
//             return new Paragraph({ 
//                 children: runs,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }


// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     let i = 0;
//     for (const section of sections) {
        
//         // --- CELL 1: NOMOR ---
//         const noCell = new TableCell({
//              children: [new Paragraph({ 
//                 text: (i + 1).toString(),
//                 alignment: AlignmentType.CENTER,
//             })],
//             borders: fullThinBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 2: LABEL (DIUBAH KE .title) ---
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 text: section.title || "", // <-- Menggunakan .title
//             })],
//             borders: fullThinBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 3: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
        
//         // Cek apakah kontennya ada dan merupakan Tiptap doc
//         if (tiptapJson && tiptapJson.type === 'doc' && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 // Periksa apakah node paragraf kosong
//                 if (node.type === 'paragraph' && (!node.content || node.content.length === 0)) {
//                     continue; // Lewati paragraf kosong
//                 }

//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } 
        
//         // Jika setelah parsing tidak ada elemen (atau jika datanya kosong), 
//         // pastikan kita tetap memasukkan 1 paragraf kosong agar selnya tidak kolaps
//         if (contentChildren.length === 0) {
//             contentChildren.push(new Paragraph(""));
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren,
//             borders: fullThinBorder, 
//             margins: cellMargins,
//         });

//         // --- Buat Baris (Sekarang 3 sel) ---
//         tableRows.push(new TableRow({
//             children: [noCell, labelCell, contentCell]
//         }));

//         i++; // Increment nomor
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---

// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApprover[] } = {
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         if (grouped[appr.type]) {
//             grouped[appr.type].push(appr);
//         }
//     });

//     // Buat baris header (Sekarang 5 kolom)
//     const headerRow = new TableRow({
//         children: [
//             // Kolom 1: Header dikosongkan 
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 2: Jabatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 3: Nama
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 4: Tanda Tangan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 5: Catatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data (Sekarang 5 kolom)
//     const createDataRows = (type: string, list: JikApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong (5 sel)
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Jabatan kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Nama kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel TTD kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Catatan kosong
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {
//             rows.push(new TableRow({
//                 children: [
//                     // Kolom 1: Tipe (Inisiator, dll)
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom 2: Jabatan (BARU - asumsi dari appr.jabatan)
//                     // @ts-ignore - Asumsi 'jabatan' ada di tipe JikApprover
//                     new TableCell({ children: [new Paragraph(appr.jabatan || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom 3: Nama
//                     new TableCell({ children: [new Paragraph(appr.name || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom 4: TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom 5: Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         // Sesuaikan lebar 5 kolom (misalnya: 15% + 25% + 25% + 15% + 20% = 100%)
//         columnWidths: [15, 25, 25, 15, 20], 
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
        
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" && valText ? `: ${valText} Tahun` : valText;
//         const displayText = key === "Contract Duration" ? valueSuffix : `${valuePrefix}${valueSuffix}`;

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: fullNoBorder, 
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph(displayText)],
//                     borders: fullNoBorder, 
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), 
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", jikData.contract_duration_years),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, 
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const jikId = body.jikId; // Ubah dari momId ke jikId

//     if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//     // Ambil data JIK dari database
//     const jikData = await prisma.jik.findUnique({
//       where: { id: parseInt(jikId as string) },
//       include: {
//         company: true, // Untuk nama perusahaan
//         jik_approvers: true, // Ambil approvers JIK
//       },
//     });

//     if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//     // 1. Buat Tabel Lembar Pengesahan
//     const approverTable = createJikApproverTable(jikData.jik_approvers);

//     // 2. Buat Tabel Info JIK (Key-Value)
//     const infoTable = createJikInfoTable(jikData);

//     // 3. Parse Konten Tiptap (document_initiative) 
//     const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//     // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
    
//     // --- BUAT HEADER ROW BARU ---
//     const mainContentHeaderRow = new TableRow({
//         children: [
//             new TableCell({
//                 children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true })], alignment: AlignmentType.CENTER })],
//                 borders: fullThinBorder,
//                 margins: cellMargins,
//                 shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                 width: { size: 5, type: WidthType.PERCENTAGE }, // Kolom No kecil
//             }),
//             new TableCell({
//                 children: [new Paragraph({ children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })], alignment: AlignmentType.CENTER })],
//                 borders: fullThinBorder,
//                 margins: cellMargins,
//                 shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                 width: { size: 35, type: WidthType.PERCENTAGE }, // Kolom Label
//             }),
//             new TableCell({
//                 children: [new Paragraph({ children: [new TextRun({ text: "KETERANGAN", bold: true })], alignment: AlignmentType.CENTER })],
//                 borders: fullThinBorder,
//                 margins: cellMargins,
//                 shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                 width: { size: 60, type: WidthType.PERCENTAGE }, // Kolom Isi
//             }),
//         ]
//     });

//     const mainContentTable = new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         // Lebar 3 kolom
//         columnWidths: [500, 4000, 5000], 
//         rows: [
//             mainContentHeaderRow, // Header
//             ...parsedContentTableRows, // Isi
//         ]
//     });


//     // --- Gabungkan Semua Elemen di Dokumen ---
//     const doc = new Document({
//       numbering: numberingConfig, // Pakai ulang config numbering
//       sections: [{
//         // JIK tidak memiliki header berulang seperti MOM
//         headers: { default: new Header({ children: [] }) }, // Header kosong
        
//         // Footer (Boleh pakai ulang)
//         footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
        
//         properties: {
//             page: {
//                 margin: {
//                     top: 1440, 
//                     right: 1440,
//                     bottom: 1440,
//                     left: 1440,
//                 }
//             }
//         },

//         // Urutan anak-anak dokumen
//         children: [
//             // 1. Judul Halaman - LEMBAR PENGESAHAN (DIUBAH WARNANYA)
//             new Paragraph({
//                 children: [new TextRun({ text: "LEMBAR PENGESAHAN", color: "000000" })], // <-- TAMBAH COLOR HITAM
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 200 }
//             }),
            
//             // 2. Tabel Approver
//             approverTable,
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 3. Judul Dokumen - DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK) (DIUBAH WARNANYA)
//             new Paragraph({
//                 children: [new TextRun({ text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)", color: "000000" })], // <-- TAMBAH COLOR HITAM
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 pageBreakBefore: true, 
//             }),
            
//             // Sub-judul - FILE JIK 3 (DIUBAH WARNANYA)
//             new Paragraph({
//                 children: [new TextRun({ text: jikData.judul.toUpperCase(), color: "000000" })], // <-- TAMBAH COLOR HITAM
//                 heading: HeadingLevel.HEADING_2,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 children: [new TextRun({ text: `No: ${jikData.no || 'xxx'}`, color: "000000" })], // <-- TAMBAH COLOR HITAM
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 300 }
//             }),

//             // 4. Tabel Info JIK (Key-Value)
//             infoTable, 
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 5. Tabel Konten Tiptap 
//             mainContentTable, 

//         ],
//       }],
//     });

//     // --- Packing dan Kirim ---
//     const buffer = await Packer.toBuffer(doc);
//     const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//     const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//     const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//     return new NextResponse(Uint8Array.from(buffer), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "Content-Disposition": `attachment; filename="${fileName}"`,
//       },
//     });

//   } catch (error: any) {
//     console.error("Error generating JIK DOCX:", error);
//     return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//   }
// }

// // File: src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//     Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// import fs from 'node:fs/promises';
// import path from 'node:path';
// import { Jik, JikApprover } from "@prisma/client"; // Import tipe data

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// // Menggunakan .NIL untuk memastikan border benar-benar hilang
// const noBorder: IBorderOptions = { style: BorderStyle.NIL, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// // Definisi ini menghilangkan border luar (top, bottom, left, right) dan dalam (insideH, insideV)
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// interface TiptapNode {
//   type: string;
//   content?: TiptapNode[];
//   text?: string;
//   marks?: { type: string }[];
//   attrs?: { src?: string; align?: 'left' | 'center' | 'right'; [key: string]: any };
// }

// // ====================================================================
// // =================== PERBAIKAN DIMULAI DI SINI ======================
// // ====================================================================
// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         // Jika tidak ada text run, kembalikan satu text run kosong
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//       alignAttr?: 'left' | 'center' | 'right'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         return AlignmentType.LEFT;
//     };

//     switch (node.type) {
//         case 'paragraph':
//             // --- LOGIKA DISINI DISERDERHANAKAN ---
//             // createTextRuns sudah menangani node.content yang undefined atau []
//             // dengan mengembalikan [new TextRun("")], jadi semua pengecekan
//             // sebelumnya tidak diperlukan lagi.
//             const runs = createTextRuns(node.content);
//             return new Paragraph({ 
//                 children: runs,
//                 alignment: getAlignment(node.attrs?.align),
//             });
// // ====================================================================
// // =================== PERBAIKAN BERAKHIR DI SINI =====================
// // ====================================================================

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }


// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     let i = 0;
//     for (const section of sections) {
        
//         // --- CELL 1: NOMOR ---
//         const noCell = new TableCell({
//              children: [new Paragraph({ 
//                 text: (i + 1).toString(),
//                 alignment: AlignmentType.CENTER,
//             })],
//             borders: fullThinBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 2: LABEL (DIUBAH KE .title) ---
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 text: section.title || "", // <-- Menggunakan .title
//             })],
//             borders: fullThinBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 3: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
        
//         // Cek apakah kontennya ada dan merupakan Tiptap doc
//         if (tiptapJson && tiptapJson.type === 'doc' && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 // Periksa apakah node paragraf kosong
//                 if (node.type === 'paragraph' && (!node.content || node.content.length === 0)) {
//                     continue; // Lewati paragraf kosong
//                 }

//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } 
        
//         // Jika setelah parsing tidak ada elemen (atau jika datanya kosong), 
//         // pastikan kita tetap memasukkan 1 paragraf kosong agar selnya tidak kolaps
//         if (contentChildren.length === 0) {
//             contentChildren.push(new Paragraph(""));
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren,
//             borders: fullThinBorder, 
//             margins: cellMargins,
//         });

//         // --- Buat Baris (Sekarang 3 sel) ---
//         tableRows.push(new TableRow({
//             children: [noCell, labelCell, contentCell]
//         }));

//         i++; // Increment nomor
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---

// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApprover[] } = {
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         if (grouped[appr.type]) {
//             grouped[appr.type].push(appr);
//         }
//     });

//     // Buat baris header (Sekarang 5 kolom)
//     const headerRow = new TableRow({
//         children: [
//             // Kolom 1: Header dikosongkan 
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 2: Jabatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 3: Nama
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 4: Tanda Tangan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 5: Catatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data (Sekarang 5 kolom)
//     const createDataRows = (type: string, list: JikApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong (5 sel)
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Jabatan kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Nama kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel TTD kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Catatan kosong
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {
//             rows.push(new TableRow({
//                 children: [
//                     // Kolom 1: Tipe (Inisiator, dll)
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom 2: Jabatan (BARU - asumsi dari appr.jabatan)
//                     // @ts-ignore - Asumsi 'jabatan' ada di tipe JikApprover
//                     new TableCell({ children: [new Paragraph(appr.jabatan || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom 3: Nama
//                     new TableCell({ children: [new Paragraph(appr.name || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom 4: TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom 5: Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         // Sesuaikan lebar 5 kolom (misalnya: 15% + 25% + 25% + 15% + 20% = 100%)
//         columnWidths: [15, 25, 25, 15, 20], 
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
        
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" && valText ? `: ${valText} Tahun` : valText;
//         const displayText = key === "Contract Duration" ? valueSuffix : `${valuePrefix}${valueSuffix}`;

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: fullNoBorder, 
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph(displayText)],
//                     borders: fullNoBorder, 
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), 
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", jikData.contract_duration_years),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, 
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const jikId = body.jikId; // Ubah dari momId ke jikId

//     if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//     // Ambil data JIK dari database
//     const jikData = await prisma.jik.findUnique({
//       where: { id: parseInt(jikId as string) },
//       include: {
//         company: true, // Untuk nama perusahaan
//         jik_approvers: true, // Ambil approvers JIK
//       },
//     });

//     if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//     // 1. Buat Tabel Lembar Pengesahan
//     const approverTable = createJikApproverTable(jikData.jik_approvers);

//     // 2. Buat Tabel Info JIK (Key-Value)
//     const infoTable = createJikInfoTable(jikData);

//     // 3. Parse Konten Tiptap (document_initiative) 
//     //    (Fungsi 'parseTiptapContent' di atas sudah diperbaiki)
//     const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//     // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
    
//     // --- BUAT HEADER ROW BARU ---
//     const mainContentHeaderRow = new TableRow({
//         children: [
//             new TableCell({
//                 children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true })], alignment: AlignmentType.CENTER })],
//                 borders: fullThinBorder,
//                 margins: cellMargins,
//                 shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                 width: { size: 5, type: WidthType.PERCENTAGE }, // Kolom No kecil
//             }),
//             new TableCell({
//                 children: [new Paragraph({ children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })], alignment: AlignmentType.CENTER })],
//                 borders: fullThinBorder,
//                 margins: cellMargins,
//                 shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                 width: { size: 35, type: WidthType.PERCENTAGE }, // Kolom Label
//             }),
//             new TableCell({
//                 children: [new Paragraph({ children: [new TextRun({ text: "KETERANGAN", bold: true })], alignment: AlignmentType.CENTER })],
//                 borders: fullThinBorder,
//                 margins: cellMargins,
//                 shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                 width: { size: 60, type: WidthType.PERCENTAGE }, // Kolom Isi
//             }),
//         ]
//     });

//     const mainContentTable = new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         // Lebar 3 kolom
//         columnWidths: [500, 4000, 5000], 
//         rows: [
//             mainContentHeaderRow, // Header
//             ...parsedContentTableRows, // Isi
//         ]
//     });


//     // --- Gabungkan Semua Elemen di Dokumen ---
//     const doc = new Document({
//       numbering: numberingConfig, // Pakai ulang config numbering
//       sections: [{
//         // JIK tidak memiliki header berulang seperti MOM
//         headers: { default: new Header({ children: [] }) }, // Header kosong
        
//         // Footer (Boleh pakai ulang)
//         footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
        
//         properties: {
//             page: {
//                 margin: {
//                     top: 1440, 
//                     right: 1440,
//                     bottom: 1440,
//                     left: 1440,
//                 }
//             }
//         },

//         // Urutan anak-anak dokumen
//         children: [
//             // 1. Judul Halaman
//             new Paragraph({
//                 text: "LEMBAR PENGESAHAN",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 200 }
//             }),
            
//             // 2. Tabel Approver
//             approverTable,
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 3. Judul Dokumen (Mulai di halaman baru)
//             new Paragraph({
//                 text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 pageBreakBefore: true, 
//             }),
            
//             new Paragraph({
//                 text: jikData.judul.toUpperCase(), // Sub-judul
//                 heading: HeadingLevel.HEADING_2,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: `No: ${jikData.no || 'xxx'}`, // Nomor JIK
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 300 }
//             }),

//             // 4. Tabel Info JIK (Key-Value)
//             infoTable, 
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 5. Tabel Konten Tiptap 
//             mainContentTable, 

//         ],
//       }],
//     });

//     // --- Packing dan Kirim ---
//     const buffer = await Packer.toBuffer(doc);
//     const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//     const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//     const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//     return new NextResponse(Uint8Array.from(buffer), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "Content-Disposition": `attachment; filename="${fileName}"`,
//       },
//     });

//   } catch (error: any) {
//     console.error("Error generating JIK DOCX:", error);
//     return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//   }
// }

// // File: src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//     Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// import fs from 'node:fs/promises';
// import path from 'node:path';
// import { Jik, JikApprover } from "@prisma/client"; // Import tipe data

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// // Menggunakan .NIL untuk memastikan border benar-benar hilang
// const noBorder: IBorderOptions = { style: BorderStyle.NIL, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// // Definisi ini menghilangkan border luar (top, bottom, left, right) dan dalam (insideH, insideV)
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// interface TiptapNode {
//   type: string;
//   content?: TiptapNode[];
//   text?: string;
//   marks?: { type: string }[];
//   attrs?: { src?: string; align?: 'left' | 'center' | 'right'; [key: string]: any };
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//       alignAttr?: 'left' | 'center' | 'right'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         return AlignmentType.LEFT;
//     };

//     switch (node.type) {
//         case 'paragraph':
//             return new Paragraph({ 
//                 children: createTextRuns(node.content),
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }

// // ====================================================================
// // =================== PERBAIKAN DIMULAI DI SINI ======================
// // ====================================================================

// // --- FUNGSI 'parseTiptapContent' DIKEMBALIKAN DAN DIMODIFIKASI ---
// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     let i = 0;
//     for (const section of sections) {
        
//         // --- CELL 1: NOMOR ---
//         const noCell = new TableCell({
//              children: [new Paragraph({ 
//                 text: (i + 1).toString(),
//                 alignment: AlignmentType.CENTER,
//             })],
//             borders: fullThinBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 2: LABEL (PERBAIKAN DI SINI) ---
//         // Disederhanakan menjadi Paragraf teks biasa, tanpa bold atau spasi
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 text: section.label || "", // <-- Gunakan properti 'text' langsung
//             })],
//             borders: fullThinBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 3: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
//         if (tiptapJson && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } else {
//             contentChildren.push(new Paragraph("")); // Konten kosong
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren.length > 0 ? contentChildren : [new Paragraph("")],
//             borders: fullThinBorder, 
//             margins: cellMargins,
//         });

//         // --- Buat Baris (Sekarang 3 sel) ---
//         tableRows.push(new TableRow({
//             children: [noCell, labelCell, contentCell]
//         }));

//         i++; // Increment nomor
//     }
//     return tableRows;
// }
// // ====================================================================
// // =================== PERBAIKAN BERAKHIR DI SINI =====================
// // ====================================================================
// // --- AKHIR PARSER TIPTAP ---

// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApprover[] } = {
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         if (grouped[appr.type]) {
//             grouped[appr.type].push(appr);
//         }
//     });

//     // Buat baris header (Sekarang 5 kolom)
//     const headerRow = new TableRow({
//         children: [
//             // Kolom 1: Header dikosongkan 
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 2: Jabatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 3: Nama
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 4: Tanda Tangan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 5: Catatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data (Sekarang 5 kolom)
//     const createDataRows = (type: string, list: JikApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong (5 sel)
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Jabatan kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Nama kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel TTD kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Catatan kosong
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {
//             rows.push(new TableRow({
//                 children: [
//                     // Kolom 1: Tipe (Inisiator, dll)
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom 2: Jabatan (BARU - asumsi dari appr.jabatan)
//                     // @ts-ignore - Asumsi 'jabatan' ada di tipe JikApprover
//                     new TableCell({ children: [new Paragraph(appr.jabatan || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom 3: Nama
//                     new TableCell({ children: [new Paragraph(appr.name || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom 4: TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom 5: Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         // Sesuaikan lebar 5 kolom (misalnya: 15% + 25% + 25% + 15% + 20% = 100%)
//         columnWidths: [15, 25, 25, 15, 20], 
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
        
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" && valText ? ` ${valText} Tahun` : valText;
//         const displayText = key === "Contract Duration" ? valueSuffix : `${valuePrefix}${valueSuffix}`;

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: fullNoBorder, 
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph(displayText)],
//                     borders: fullNoBorder, 
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), 
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", jikData.contract_duration_years),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, 
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const jikId = body.jikId; // Ubah dari momId ke jikId

//     if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//     // Ambil data JIK dari database
//     const jikData = await prisma.jik.findUnique({
//       where: { id: parseInt(jikId as string) },
//       include: {
//         company: true, // Untuk nama perusahaan
//         jik_approvers: true, // Ambil approvers JIK
//       },
//     });

//     if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//     // 1. Buat Tabel Lembar Pengesahan
//     const approverTable = createJikApproverTable(jikData.jik_approvers);

//     // 2. Buat Tabel Info JIK (Key-Value)
//     const infoTable = createJikInfoTable(jikData);

//     // 3. Parse Konten Tiptap (document_initiative) 
//     //    (Fungsi 'parseTiptapContent' di atas sudah diperbaiki)
//     const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//     // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
    
//     // --- BUAT HEADER ROW BARU ---
//     const mainContentHeaderRow = new TableRow({
//         children: [
//             new TableCell({
//                 children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true })], alignment: AlignmentType.CENTER })],
//                 borders: fullThinBorder,
//                 margins: cellMargins,
//                 shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                 width: { size: 5, type: WidthType.PERCENTAGE }, // Kolom No kecil
//             }),
//             new TableCell({
//                 children: [new Paragraph({ children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })], alignment: AlignmentType.CENTER })],
//                 borders: fullThinBorder,
//                 margins: cellMargins,
//                 shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                 width: { size: 35, type: WidthType.PERCENTAGE }, // Kolom Label
//             }),
//             new TableCell({
//                 children: [new Paragraph({ children: [new TextRun({ text: "KETERANGAN", bold: true })], alignment: AlignmentType.CENTER })],
//                 borders: fullThinBorder,
//                 margins: cellMargins,
//                 shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                 width: { size: 60, type: WidthType.PERCENTAGE }, // Kolom Isi
//             }),
//         ]
//     });

//     const mainContentTable = new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         // Lebar 3 kolom
//         columnWidths: [500, 4000, 5000], 
//         rows: [
//             mainContentHeaderRow, // Header
//             ...parsedContentTableRows, // Isi
//         ]
//     });


//     // --- Gabungkan Semua Elemen di Dokumen ---
//     const doc = new Document({
//       numbering: numberingConfig, // Pakai ulang config numbering
//       sections: [{
//         // JIK tidak memiliki header berulang seperti MOM
//         headers: { default: new Header({ children: [] }) }, // Header kosong
        
//         // Footer (Boleh pakai ulang)
//         footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
        
//         properties: {
//             page: {
//                 margin: {
//                     top: 1440, 
//                     right: 1440,
//                     bottom: 1440,
//                     left: 1440,
//                 }
//             }
//         },

//         // Urutan anak-anak dokumen
//         children: [
//             // 1. Judul Halaman
//             new Paragraph({
//                 text: "LEMBAR PENGESAHAN",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 200 }
//             }),
            
//             // 2. Tabel Approver
//             approverTable,
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 3. Judul Dokumen (Mulai di halaman baru)
//             new Paragraph({
//                 text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 pageBreakBefore: true, 
//             }),
            
//             new Paragraph({
//                 text: jikData.judul.toUpperCase(), // Sub-judul
//                 heading: HeadingLevel.HEADING_2,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: `No: ${jikData.no || 'xxx'}`, // Nomor JIK
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 300 }
//             }),

//             // 4. Tabel Info JIK (Key-Value)
//             infoTable, 
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 5. Tabel Konten Tiptap 
//             mainContentTable, 

//         ],
//       }],
//     });

//     // --- Packing dan Kirim ---
//     const buffer = await Packer.toBuffer(doc);
//     const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//     const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//     const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//     return new NextResponse(Uint8Array.from(buffer), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "Content-Disposition": `attachment; filename="${fileName}"`,
//       },
//     });

//   } catch (error: any) {
//     console.error("Error generating JIK DOCX:", error);
//     return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//   }
// }

// // File: src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//     Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// import fs from 'node:fs/promises';
// import path from 'node:path';
// import { Jik, JikApprover } from "@prisma/client"; // Import tipe data

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// // Menggunakan .NIL untuk memastikan border benar-benar hilang
// const noBorder: IBorderOptions = { style: BorderStyle.NIL, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// // Definisi ini menghilangkan border luar (top, bottom, left, right) dan dalam (insideH, insideV)
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// interface TiptapNode {
//   type: string;
//   content?: TiptapNode[];
//   text?: string;
//   marks?: { type: string }[];
//   attrs?: { src?: string; align?: 'left' | 'center' | 'right'; [key: string]: any };
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//       alignAttr?: 'left' | 'center' | 'right'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         return AlignmentType.LEFT;
//     };

//     switch (node.type) {
//         case 'paragraph':
//             return new Paragraph({ 
//                 children: createTextRuns(node.content),
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }

// // ====================================================================
// // =================== PERBAIKAN DIMULAI DI SINI ======================
// // ====================================================================

// // --- FUNGSI 'parseTiptapContent' DIKEMBALIKAN DAN DIMODIFIKASI ---
// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     // Gunakan for...of dengan index (atau .map) untuk mendapatkan nomor
//     let i = 0;
//     for (const section of sections) {
        
//         // --- CELL 1: NOMOR ---
//         const noCell = new TableCell({
//              children: [new Paragraph({ 
//                 text: (i + 1).toString(),
//                 alignment: AlignmentType.CENTER,
//             })],
//             borders: fullThinBorder, // <-- BORDER TERLIHAT
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 2: LABEL ---
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 children: [new TextRun({ text: section.label, bold: true })],
//                 spacing: { after: 100, before: 100 } 
//             })],
//             borders: fullThinBorder, // <-- BORDER TERLIHAT
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 3: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
//         if (tiptapJson && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } else {
//             contentChildren.push(new Paragraph("")); // Konten kosong
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren.length > 0 ? contentChildren : [new Paragraph("")],
//             borders: fullThinBorder, // <-- BORDER TERLIHAT
//             margins: cellMargins,
//         });

//         // --- Buat Baris (Sekarang 3 sel) ---
//         tableRows.push(new TableRow({
//             children: [noCell, labelCell, contentCell]
//         }));

//         i++; // Increment nomor
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---

// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApprover[] } = {
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         if (grouped[appr.type]) {
//             grouped[appr.type].push(appr);
//         }
//     });

//     // Buat baris header (Sekarang 5 kolom)
//     const headerRow = new TableRow({
//         children: [
//             // Kolom 1: Header dikosongkan 
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 2: Jabatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 3: Nama
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 4: Tanda Tangan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 5: Catatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data (Sekarang 5 kolom)
//     const createDataRows = (type: string, list: JikApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong (5 sel)
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Jabatan kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Nama kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel TTD kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Catatan kosong
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {
//             rows.push(new TableRow({
//                 children: [
//                     // Kolom 1: Tipe (Inisiator, dll)
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom 2: Jabatan (BARU - asumsi dari appr.jabatan)
//                     // @ts-ignore - Asumsi 'jabatan' ada di tipe JikApprover
//                     new TableCell({ children: [new Paragraph(appr.jabatan || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom 3: Nama
//                     new TableCell({ children: [new Paragraph(appr.name || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom 4: TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom 5: Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         // Sesuaikan lebar 5 kolom (misalnya: 15% + 25% + 25% + 15% + 20% = 100%)
//         columnWidths: [15, 25, 25, 15, 20], 
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
        
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" && valText ? ` ${valText} Tahun` : valText;
//         const displayText = key === "Contract Duration" ? valueSuffix : `${valuePrefix}${valueSuffix}`;

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: fullNoBorder, 
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph(displayText)],
//                     borders: fullNoBorder, 
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), 
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", jikData.contract_duration_years),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, 
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const jikId = body.jikId; // Ubah dari momId ke jikId

//     if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//     // Ambil data JIK dari database
//     const jikData = await prisma.jik.findUnique({
//       where: { id: parseInt(jikId as string) },
//       include: {
//         company: true, // Untuk nama perusahaan
//         jik_approvers: true, // Ambil approvers JIK
//       },
//     });

//     if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//     // 1. Buat Tabel Lembar Pengesahan
//     const approverTable = createJikApproverTable(jikData.jik_approvers);

//     // 2. Buat Tabel Info JIK (Key-Value)
//     const infoTable = createJikInfoTable(jikData);

//     // 3. Parse Konten Tiptap (document_initiative) - DIKEMBALIKAN
//     const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//     // 4. Buat Tabel Konten Utama (yang berisi Tiptap) - DIMODIFIKASI
    
//     // --- BUAT HEADER ROW BARU ---
//     const mainContentHeaderRow = new TableRow({
//         children: [
//             new TableCell({
//                 children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true })], alignment: AlignmentType.CENTER })],
//                 borders: fullThinBorder,
//                 margins: cellMargins,
//                 shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                 width: { size: 5, type: WidthType.PERCENTAGE }, // Kolom No kecil
//             }),
//             new TableCell({
//                 children: [new Paragraph({ children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })], alignment: AlignmentType.CENTER })],
//                 borders: fullThinBorder,
//                 margins: cellMargins,
//                 shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                 width: { size: 35, type: WidthType.PERCENTAGE }, // Kolom Label
//             }),
//             new TableCell({
//                 children: [new Paragraph({ children: [new TextRun({ text: "KETERANGAN", bold: true })], alignment: AlignmentType.CENTER })],
//                 borders: fullThinBorder,
//                 margins: cellMargins,
//                 shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                 width: { size: 60, type: WidthType.PERCENTAGE }, // Kolom Isi
//             }),
//         ]
//     });

//     const mainContentTable = new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         // Lebar 3 kolom
//         columnWidths: [500, 4000, 5000], 
//         // borders: fullThinBorder, // Border diatur per sel
//         rows: [
//             mainContentHeaderRow, // Header
//             ...parsedContentTableRows, // Isi
//         ]
//     });
//     // ====================================================================
//     // =================== PERBAIKAN BERAKHIR DI SINI =====================
//     // ====================================================================


//     // --- Gabungkan Semua Elemen di Dokumen ---
//     const doc = new Document({
//       numbering: numberingConfig, // Pakai ulang config numbering
//       sections: [{
//         // JIK tidak memiliki header berulang seperti MOM
//         headers: { default: new Header({ children: [] }) }, // Header kosong
        
//         // Footer (Boleh pakai ulang)
//         footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
        
//         properties: {
//             page: {
//                 margin: {
//                     top: 1440, 
//                     right: 1440,
//                     bottom: 1440,
//                     left: 1440,
//                 }
//             }
//         },

//         // Urutan anak-anak dokumen
//         children: [
//             // 1. Judul Halaman
//             new Paragraph({
//                 text: "LEMBAR PENGESAHAN",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 200 }
//             }),
            
//             // 2. Tabel Approver
//             approverTable,
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 3. Judul Dokumen (Mulai di halaman baru)
//             new Paragraph({
//                 text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 pageBreakBefore: true, 
//             }),
            
//             new Paragraph({
//                 text: jikData.judul.toUpperCase(), // Sub-judul
//                 heading: HeadingLevel.HEADING_2,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: `No: ${jikData.no || 'xxx'}`, // Nomor JIK
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 300 }
//             }),

//             // 4. Tabel Info JIK (Key-Value)
//             infoTable, 
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 5. Tabel Konten Tiptap (DIKEMBALIKAN)
//             mainContentTable, 

//         ],
//       }],
//     });

//     // --- Packing dan Kirim ---
//     const buffer = await Packer.toBuffer(doc);
//     const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//     const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//     const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//     return new NextResponse(Uint8Array.from(buffer), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "Content-Disposition": `attachment; filename="${fileName}"`,
//       },
//     });

//   } catch (error: any) {
//     console.error("Error generating JIK DOCX:", error);
//     return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//   }
// }

// // File: src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//     Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// import fs from 'node:fs/promises';
// import path from 'node:path';
// import { Jik, JikApprover } from "@prisma/client"; // Import tipe data

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// // Menggunakan .NIL untuk memastikan border benar-benar hilang
// const noBorder: IBorderOptions = { style: BorderStyle.NIL, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// // Definisi ini menghilangkan border luar (top, bottom, left, right) dan dalam (insideH, insideV)
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// // (Ini akan mem-parsing Jik.document_initiative)
// interface TiptapNode {
//   type: string;
//   content?: TiptapNode[];
//   text?: string;
//   marks?: { type: string }[];
//   attrs?: { src?: string; align?: 'left' | 'center' | 'right'; [key: string]: any };
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//       alignAttr?: 'left' | 'center' | 'right'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         return AlignmentType.LEFT;
//     };

//     switch (node.type) {
//         case 'paragraph':
//             return new Paragraph({ 
//                 children: createTextRuns(node.content),
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }

// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     for (const section of sections) {
        
//         // --- CELL 1: LABEL ---
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 children: [new TextRun({ text: section.label, bold: true })],
//                 spacing: { after: 100, before: 100 } 
//             })],
//             borders: fullNoBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 2: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
//         if (tiptapJson && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } else {
//             contentChildren.push(new Paragraph("")); // Konten kosong
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren.length > 0 ? contentChildren : [new Paragraph("")],
//             borders: fullNoBorder, 
//             margins: cellMargins,
//         });

//         // --- Buat Baris ---
//         tableRows.push(new TableRow({
//             children: [labelCell, contentCell]
//         }));
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---

// // --- PARSER APPROVER JIK (BARU) ---
// // ====================================================================
// // =================== PERBAIKAN DIMULAI DI SINI ======================
// // ====================================================================
// function createJikApproverTable(approvers: JikApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApprover[] } = {
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         if (grouped[appr.type]) {
//             grouped[appr.type].push(appr);
//         }
//     });

//     // Buat baris header (Sekarang 5 kolom)
//     const headerRow = new TableRow({
//         children: [
//             // Kolom 1: Header dikosongkan sesuai permintaan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 2: Jabatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 3: Nama
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 4: Tanda Tangan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 5: Catatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data (Sekarang 5 kolom)
//     const createDataRows = (type: string, list: JikApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong (5 sel)
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Jabatan kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Nama kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel TTD kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Catatan kosong
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {
//             rows.push(new TableRow({
//                 children: [
//                     // Kolom 1: Tipe (Inisiator, dll)
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom 2: Jabatan (BARU - asumsi dari appr.jabatan)
//                     // @ts-ignore - Asumsi 'jabatan' ada di tipe JikApprover
//                     new TableCell({ children: [new Paragraph(appr.jabatan || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom 3: Nama
//                     new TableCell({ children: [new Paragraph(appr.name || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom 4: TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom 5: Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         // Sesuaikan lebar 5 kolom (misalnya: 15% + 25% + 25% + 15% + 20% = 100%)
//         columnWidths: [15, 25, 25, 15, 20], 
//     });
// }
// // ====================================================================
// // =================== PERBAIKAN BERAKHIR DI SINI =====================
// // ====================================================================
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
        
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" && valText ? ` ${valText} Tahun` : valText;
//         const displayText = key === "Contract Duration" ? valueSuffix : `${valuePrefix}${valueSuffix}`;

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: fullNoBorder, 
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph(displayText)],
//                     borders: fullNoBorder, 
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), 
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", jikData.contract_duration_years),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, 
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const jikId = body.jikId; // Ubah dari momId ke jikId

//     if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//     // Ambil data JIK dari database
//     const jikData = await prisma.jik.findUnique({
//       where: { id: parseInt(jikId as string) },
//       include: {
//         company: true, // Untuk nama perusahaan
//         jik_approvers: true, // Ambil approvers JIK
//       },
//     });

//     if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//     // 1. Buat Tabel Lembar Pengesahan (Sudah dimodifikasi)
//     const approverTable = createJikApproverTable(jikData.jik_approvers);

//     // 2. Buat Tabel Info JIK (Key-Value)
//     const infoTable = createJikInfoTable(jikData);

//     // 3. Parse Konten Tiptap (document_initiative)
//     const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//     // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
//     const mainContentTable = new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, 
//         rows: [
//             // BARIS 1: Judul "DOKUMEN INISIATIF"
//              new TableRow({
//                 children: [
//                     new TableCell({
//                         children: [new Paragraph({
//                             alignment: AlignmentType.CENTER,
//                             children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })]
//                         })],
//                         columnSpan: 2,
//                         borders: fullNoBorder, 
//                         margins: cellMargins,
//                     }),
//                 ]
//             }),
//             // BARIS 2 dst: Section Konten Tiptap
//             ...parsedContentTableRows,
//         ]
//     });


//     // --- Gabungkan Semua Elemen di Dokumen ---
//     const doc = new Document({
//       numbering: numberingConfig, // Pakai ulang config numbering
//       sections: [{
//         // JIK tidak memiliki header berulang seperti MOM
//         headers: { default: new Header({ children: [] }) }, // Header kosong
        
//         // Footer (Boleh pakai ulang)
//         footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
        
//         properties: {
//             page: {
//                 margin: {
//                     top: 1440, 
//                     right: 1440,
//                     bottom: 1440,
//                     left: 1440,
//                 }
//             }
//         },

//         // Urutan anak-anak dokumen
//         children: [
//             // 1. Judul Halaman
//             new Paragraph({
//                 text: "LEMBAR PENGESAHAN",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 200 }
//             }),
            
//             // 2. Tabel Approver
//             approverTable,
//             // (Spasi setelah tabel approver, masih di halaman pertama)
//             new Paragraph({ text: "", spacing: { after: 400 } }), 

//             // 3. Judul Dokumen (Mulai di halaman baru)
//             new Paragraph({
//                 text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 pageBreakBefore: true, // <-- Tetap ada page break
//             }),
            
//             new Paragraph({
//                 text: jikData.judul.toUpperCase(), // Sub-judul
//                 heading: HeadingLevel.HEADING_2,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: `No: ${jikData.no || 'xxx'}`, // Nomor JIK
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 300 }
//             }),

//             // 4. Tabel Info JIK (Key-Value)
//             infoTable, // Ini adalah tabel yang bordernya sudah dihilangkan
//             new Paragraph({ text: "", spacing: { after: 200 } }), // Spasi

//             // 5. Tabel Konten Tiptap
//             mainContentTable, // Ini adalah tabel yang bordernya sudah dihilangkan

//             // (JIK tidak memiliki "Next Action" atau "Lampiran" seperti MOM di schema)
//         ],
//       }],
//     });

//     // --- Packing dan Kirim ---
//     const buffer = await Packer.toBuffer(doc);
//     const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//     const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//     const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//     return new NextResponse(Uint8Array.from(buffer), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "Content-Disposition": `attachment; filename="${fileName}"`,
//       },
//     });

//   } catch (error: any) {
//     console.error("Error generating JIK DOCX:", error);
//     return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//   }
// }

// // File: src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//     Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// import fs from 'node:fs/promises';
// import path from 'node:path';
// import { Jik, JikApprover } from "@prisma/client"; // Import tipe data

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// // Menggunakan .NIL untuk memastikan border benar-benar hilang
// const noBorder: IBorderOptions = { style: BorderStyle.NIL, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// // Definisi ini menghilangkan border luar (top, bottom, left, right) dan dalam (insideH, insideV)
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// // (Ini akan mem-parsing Jik.document_initiative)
// interface TiptapNode {
//   type: string;
//   content?: TiptapNode[];
//   text?: string;
//   marks?: { type: string }[];
//   attrs?: { src?: string; align?: 'left' | 'center' | 'right'; [key: string]: any };
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//       alignAttr?: 'left' | 'center' | 'right'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         return AlignmentType.LEFT;
//     };

//     switch (node.type) {
//         case 'paragraph':
//             return new Paragraph({ 
//                 children: createTextRuns(node.content),
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }

// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     for (const section of sections) {
        
//         // --- CELL 1: LABEL ---
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 children: [new TextRun({ text: section.label, bold: true })],
//                 spacing: { after: 100, before: 100 } 
//             })],
//             borders: fullNoBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 2: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
//         if (tiptapJson && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } else {
//             contentChildren.push(new Paragraph("")); // Konten kosong
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren.length > 0 ? contentChildren : [new Paragraph("")],
//             borders: fullNoBorder, 
//             margins: cellMargins,
//         });

//         // --- Buat Baris ---
//         tableRows.push(new TableRow({
//             children: [labelCell, contentCell]
//         }));
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---

// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApprover[] } = {
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         if (grouped[appr.type]) {
//             grouped[appr.type].push(appr);
//         }
//     });

//     // Buat baris header
//     const headerRow = new TableRow({
//         children: [
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data
//     const createDataRows = (type: string, list: JikApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {
//             rows.push(new TableRow({
//                 children: [
//                     // Kolom Tipe (Jabatan) hanya di baris pertama grup
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom Nama
//                     new TableCell({ children: [new Paragraph(appr.name || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [25, 25, 25, 25], // 4 kolom
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
        
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" && valText ? ` ${valText} Tahun` : valText;
//         const displayText = key === "Contract Duration" ? valueSuffix : `${valuePrefix}${valueSuffix}`;

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: fullNoBorder, 
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph(displayText)],
//                     borders: fullNoBorder, 
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), 
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", jikData.contract_duration_years),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, 
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const jikId = body.jikId; // Ubah dari momId ke jikId

//     if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//     // Ambil data JIK dari database
//     const jikData = await prisma.jik.findUnique({
//       where: { id: parseInt(jikId as string) },
//       include: {
//         company: true, // Untuk nama perusahaan
//         jik_approvers: true, // Ambil approvers JIK
//       },
//     });

//     if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//     // 1. Buat Tabel Lembar Pengesahan
//     const approverTable = createJikApproverTable(jikData.jik_approvers);

//     // 2. Buat Tabel Info JIK (Key-Value)
//     const infoTable = createJikInfoTable(jikData);

//     // 3. Parse Konten Tiptap (document_initiative)
//     const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//     // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
//     const mainContentTable = new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, 
//         rows: [
//             // BARIS 1: Judul "DOKUMEN INISIATIF"
//              new TableRow({
//                 children: [
//                     new TableCell({
//                         children: [new Paragraph({
//                             alignment: AlignmentType.CENTER,
//                             children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })]
//                         })],
//                         columnSpan: 2,
//                         borders: fullNoBorder, 
//                         margins: cellMargins,
//                     }),
//                 ]
//             }),
//             // BARIS 2 dst: Section Konten Tiptap
//             ...parsedContentTableRows,
//         ]
//     });


//     // --- Gabungkan Semua Elemen di Dokumen ---
//     const doc = new Document({
//       numbering: numberingConfig, // Pakai ulang config numbering
//       sections: [{
//         // JIK tidak memiliki header berulang seperti MOM
//         headers: { default: new Header({ children: [] }) }, // Header kosong
        
//         // Footer (Boleh pakai ulang)
//         footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
        
//         properties: {
//             page: {
//                 margin: {
//                     top: 1440, 
//                     right: 1440,
//                     bottom: 1440,
//                     left: 1440,
//                 }
//             }
//         },

//         // Urutan anak-anak dokumen
//         children: [
//             // 1. Judul Halaman
//             new Paragraph({
//                 text: "LEMBAR PENGESAHAN",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 200 }
//             }),
            
//             // 2. Tabel Approver
//             approverTable,
//             // (Spasi setelah tabel approver, masih di halaman pertama)
//             new Paragraph({ text: "", spacing: { after: 400 } }), 

//             // ====================================================================
//             // =================== PERBAIKAN DI SINI ==============================
//             // 3. Judul Dokumen (Mulai di halaman baru)
//             new Paragraph({
//                 text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 pageBreakBefore: true, // <-- TAMBAHKAN INI UNTUK PINDAH HALAMAN
//             }),
//             // ====================================================================

//             new Paragraph({
//                 text: jikData.judul.toUpperCase(), // Sub-judul
//                 heading: HeadingLevel.HEADING_2,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: `No: ${jikData.no || 'xxx'}`, // Nomor JIK
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 300 }
//             }),

//             // 4. Tabel Info JIK (Key-Value)
//             infoTable, // Ini adalah tabel yang bordernya sudah dihilangkan
//             new Paragraph({ text: "", spacing: { after: 200 } }), // Spasi

//             // 5. Tabel Konten Tiptap
//             mainContentTable, // Ini adalah tabel yang bordernya sudah dihilangkan

//             // (JIK tidak memiliki "Next Action" atau "Lampiran" seperti MOM di schema)
//         ],
//       }],
//     });

//     // --- Packing dan Kirim ---
//     const buffer = await Packer.toBuffer(doc);
//     const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//     const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//     const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//     return new NextResponse(Uint8Array.from(buffer), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "Content-Disposition": `attachment; filename="${fileName}"`,
//       },
//     });

//   } catch (error: any) {
//     console.error("Error generating JIK DOCX:", error);
//     return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//   }
// }

// // File: src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//     Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// import fs from 'node:fs/promises';
// import path from 'node:path';
// import { Jik, JikApprover } from "@prisma/client"; // Import tipe data

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };

// // ====================================================================
// // =================== PERBAIKAN DI BARIS INI =========================
// // Mengganti .NONE menjadi .NIL untuk memastikan border benar-benar hilang
// const noBorder: IBorderOptions = { style: BorderStyle.NIL, size: 0, color: "auto" };
// // ====================================================================

// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// // Definisi fullNoBorder ini sudah benar, sekarang menggunakan noBorder (NIL)
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// // (Ini akan mem-parsing Jik.document_initiative)
// interface TiptapNode {
//   type: string;
//   content?: TiptapNode[];
//   text?: string;
//   marks?: { type: string }[];
//   attrs?: { src?: string; align?: 'left' | 'center' | 'right'; [key: string]: any };
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//       alignAttr?: 'left' | 'center' | 'right'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         return AlignmentType.LEFT;
//     };

//     switch (node.type) {
//         case 'paragraph':
//             return new Paragraph({ 
//                 children: createTextRuns(node.content),
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }

// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     for (const section of sections) {
        
//         // --- CELL 1: LABEL ---
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 children: [new TextRun({ text: section.label, bold: true })],
//                 spacing: { after: 100, before: 100 } 
//             })],
//             borders: fullNoBorder, // Menggunakan 'fullNoBorder' (NIL)
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 2: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
//         if (tiptapJson && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } else {
//             contentChildren.push(new Paragraph("")); // Konten kosong
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren.length > 0 ? contentChildren : [new Paragraph("")],
//             borders: fullNoBorder, // Menggunakan 'fullNoBorder' (NIL)
//             margins: cellMargins,
//         });

//         // --- Buat Baris ---
//         tableRows.push(new TableRow({
//             children: [labelCell, contentCell]
//         }));
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---

// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApprover[] } = {
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         if (grouped[appr.type]) {
//             grouped[appr.type].push(appr);
//         }
//     });

//     // Buat baris header
//     const headerRow = new TableRow({
//         children: [
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data
//     const createDataRows = (type: string, list: JikApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {
//             rows.push(new TableRow({
//                 children: [
//                     // Kolom Tipe (Jabatan) hanya di baris pertama grup
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom Nama
//                     new TableCell({ children: [new Paragraph(appr.name || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [25, 25, 25, 25], // 4 kolom
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
        
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" && valText ? ` ${valText} Tahun` : valText;
//         const displayText = key === "Contract Duration" ? valueSuffix : `${valuePrefix}${valueSuffix}`;

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: fullNoBorder, // Menggunakan 'fullNoBorder' (NIL)
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph(displayText)],
//                     borders: fullNoBorder, // Menggunakan 'fullNoBorder' (NIL)
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), 
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", jikData.contract_duration_years),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, // Menggunakan 'fullNoBorder' (NIL)
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const jikId = body.jikId; // Ubah dari momId ke jikId

//     if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//     // Ambil data JIK dari database
//     const jikData = await prisma.jik.findUnique({
//       where: { id: parseInt(jikId as string) },
//       include: {
//         company: true, // Untuk nama perusahaan
//         jik_approvers: true, // Ambil approvers JIK
//       },
//     });

//     if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//     // 1. Buat Tabel Lembar Pengesahan
//     const approverTable = createJikApproverTable(jikData.jik_approvers);

//     // 2. Buat Tabel Info JIK (Key-Value)
//     const infoTable = createJikInfoTable(jikData);

//     // 3. Parse Konten Tiptap (document_initiative)
//     const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//     // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
//     const mainContentTable = new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, // Menggunakan 'fullNoBorder' (NIL)
//         rows: [
//             // BARIS 1: Judul "DOKUMEN INISIATIF"
//              new TableRow({
//                 children: [
//                     new TableCell({
//                         children: [new Paragraph({
//                             alignment: AlignmentType.CENTER,
//                             children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })]
//                         })],
//                         columnSpan: 2,
//                         borders: fullNoBorder, // Menggunakan 'fullNoBorder' (NIL)
//                         margins: cellMargins,
//                     }),
//                 ]
//             }),
//             // BARIS 2 dst: Section Konten Tiptap
//             ...parsedContentTableRows,
//         ]
//     });


//     // --- Gabungkan Semua Elemen di Dokumen ---
//     const doc = new Document({
//       numbering: numberingConfig, // Pakai ulang config numbering
//       sections: [{
//         // JIK tidak memiliki header berulang seperti MOM
//         headers: { default: new Header({ children: [] }) }, // Header kosong
        
//         // Footer (Boleh pakai ulang)
//         footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
        
//         properties: {
//             page: {
//                 margin: {
//                     top: 1440, 
//                     right: 1440,
//                     bottom: 1440,
//                     left: 1440,
//                 }
//             }
//         },

//         // Urutan anak-anak dokumen
//         children: [
//             // 1. Judul Halaman
//             new Paragraph({
//                 text: "LEMBAR PENGESAHAN",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 200 }
//             }),
            
//             // 2. Tabel Approver
//             approverTable,
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 3. Judul Dokumen
//             new Paragraph({
//                 text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: jikData.judul.toUpperCase(), // Sub-judul
//                 heading: HeadingLevel.HEADING_2,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: `No: ${jikData.no || 'xxx'}`, // Nomor JIK
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 300 }
//             }),

//             // 4. Tabel Info JIK (Key-Value)
//             infoTable, // Ini adalah tabel yang bordernya sudah dihilangkan
//             new Paragraph({ text: "", spacing: { after: 200 } }), // Spasi

//             // 5. Tabel Konten Tiptap
//             mainContentTable, // Ini adalah tabel yang bordernya sudah dihilangkan

//             // (JIK tidak memiliki "Next Action" atau "Lampiran" seperti MOM di schema)
//         ],
//       }],
//     });

//     // --- Packing dan Kirim ---
//     const buffer = await Packer.toBuffer(doc);
//     const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//     const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//     const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//     return new NextResponse(Uint8Array.from(buffer), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "Content-Disposition": `attachment; filename="${fileName}"`,
//       },
//     });

//   } catch (error: any) {
//     console.error("Error generating JIK DOCX:", error);
//     return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//   }
// }

// // File: src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//     Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// import fs from 'node:fs/promises';
// import path from 'node:path';
// import { Jik, JikApprover } from "@prisma/client"; // Import tipe data

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// const noBorder: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };

// // ====================================================================
// // =================== PERBAIKAN DI BARIS INI =========================
// // Kita tambahkan 'insideH' dan 'insideV' untuk menghilangkan border internal
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };
// // ====================================================================


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// // (Ini akan mem-parsing Jik.document_initiative)
// interface TiptapNode {
//   type: string;
//   content?: TiptapNode[];
//   text?: string;
//   marks?: { type: string }[];
//   attrs?: { src?: string; align?: 'left' | 'center' | 'right'; [key: string]: any };
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//       alignAttr?: 'left' | 'center' | 'right'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         return AlignmentType.LEFT;
//     };

//     switch (node.type) {
//         case 'paragraph':
//             return new Paragraph({ 
//                 children: createTextRuns(node.content),
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }

// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     for (const section of sections) {
        
//         // --- CELL 1: LABEL ---
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 children: [new TextRun({ text: section.label, bold: true })],
//                 spacing: { after: 100, before: 100 } 
//             })],
//             borders: fullNoBorder, // Ini menggunakan 'fullNoBorder' yang baru
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 2: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
//         if (tiptapJson && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } else {
//             contentChildren.push(new Paragraph("")); // Konten kosong
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren.length > 0 ? contentChildren : [new Paragraph("")],
//             borders: fullNoBorder, // Ini menggunakan 'fullNoBorder' yang baru
//             margins: cellMargins,
//         });

//         // --- Buat Baris ---
//         tableRows.push(new TableRow({
//             children: [labelCell, contentCell]
//         }));
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---

// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApprover[] } = {
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         if (grouped[appr.type]) {
//             grouped[appr.type].push(appr);
//         }
//     });

//     // Buat baris header
//     const headerRow = new TableRow({
//         children: [
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data
//     const createDataRows = (type: string, list: JikApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {
//             rows.push(new TableRow({
//                 children: [
//                     // Kolom Tipe (Jabatan) hanya di baris pertama grup
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom Nama
//                     new TableCell({ children: [new Paragraph(appr.name || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [25, 25, 25, 25], // 4 kolom
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
        
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" && valText ? ` ${valText} Tahun` : valText;
//         const displayText = key === "Contract Duration" ? valueSuffix : `${valuePrefix}${valueSuffix}`;

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: fullNoBorder, // Ini menggunakan 'fullNoBorder' yang baru
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph(displayText)],
//                     borders: fullNoBorder, // Ini menggunakan 'fullNoBorder' yang baru
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), 
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", jikData.contract_duration_years),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, // Ini menggunakan 'fullNoBorder' yang baru
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const jikId = body.jikId; // Ubah dari momId ke jikId

//     if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//     // Ambil data JIK dari database
//     const jikData = await prisma.jik.findUnique({
//       where: { id: parseInt(jikId as string) },
//       include: {
//         company: true, // Untuk nama perusahaan
//         jik_approvers: true, // Ambil approvers JIK
//       },
//     });

//     if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//     // 1. Buat Tabel Lembar Pengesahan
//     const approverTable = createJikApproverTable(jikData.jik_approvers);

//     // 2. Buat Tabel Info JIK (Key-Value)
//     const infoTable = createJikInfoTable(jikData);

//     // 3. Parse Konten Tiptap (document_initiative)
//     const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//     // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
//     const mainContentTable = new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         columnWidths: [4000, 5500],
//         // Kita juga terapkan 'fullNoBorder' di sini agar konsisten
//         borders: fullNoBorder, 
//         rows: [
//             // BARIS 1: Judul "DOKUMEN INISIATIF"
//              new TableRow({
//                 children: [
//                     new TableCell({
//                         children: [new Paragraph({
//                             alignment: AlignmentType.CENTER,
//                             children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })]
//                         })],
//                         columnSpan: 2,
//                         borders: fullNoBorder, // Ini menggunakan 'fullNoBorder' yang baru
//                         margins: cellMargins,
//                     }),
//                 ]
//             }),
//             // BARIS 2 dst: Section Konten Tiptap
//             ...parsedContentTableRows,
//         ]
//     });


//     // --- Gabungkan Semua Elemen di Dokumen ---
//     const doc = new Document({
//       numbering: numberingConfig, // Pakai ulang config numbering
//       sections: [{
//         // JIK tidak memiliki header berulang seperti MOM
//         headers: { default: new Header({ children: [] }) }, // Header kosong
        
//         // Footer (Boleh pakai ulang)
//         footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
        
//         properties: {
//             page: {
//                 margin: {
//                     top: 1440, 
//                     right: 1440,
//                     bottom: 1440,
//                     left: 1440,
//                 }
//             }
//         },

//         // Urutan anak-anak dokumen
//         children: [
//             // 1. Judul Halaman
//             new Paragraph({
//                 text: "LEMBAR PENGESAHAN",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 200 }
//             }),
            
//             // 2. Tabel Approver
//             approverTable,
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 3. Judul Dokumen
//             new Paragraph({
//                 text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: jikData.judul.toUpperCase(), // Sub-judul
//                 heading: HeadingLevel.HEADING_2,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: `No: ${jikData.no || 'xxx'}`, // Nomor JIK
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 300 }
//             }),

//             // 4. Tabel Info JIK (Key-Value)
//             infoTable, // Ini adalah tabel yang bordernya sudah dihilangkan
//             new Paragraph({ text: "", spacing: { after: 200 } }), // Spasi

//             // 5. Tabel Konten Tiptap
//             mainContentTable, // Ini adalah tabel yang bordernya sudah dihilangkan

//             // (JIK tidak memiliki "Next Action" atau "Lampiran" seperti MOM di schema)
//         ],
//       }],
//     });

//     // --- Packing dan Kirim ---
//     const buffer = await Packer.toBuffer(doc);
//     const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//     const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//     const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//     return new NextResponse(Uint8Array.from(buffer), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "Content-Disposition": `attachment; filename="${fileName}"`,
//       },
//     });

//   } catch (error: any) {
//     console.error("Error generating JIK DOCX:", error);
//     return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//   }
// }

// // File: src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//   Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// import fs from 'node:fs/promises';
// import path from 'node:path';
// import { Jik, JikApprover } from "@prisma/client"; // Import tipe data

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// const noBorder: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// // (Ini akan mem-parsing Jik.document_initiative)
// interface TiptapNode {
//   type: string;
//   content?: TiptapNode[];
//   text?: string;
//   marks?: { type: string }[];
//   attrs?: { src?: string; align?: 'left' | 'center' | 'right'; [key: string]: any };
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//       alignAttr?: 'left' | 'center' | 'right'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         return AlignmentType.LEFT;
//     };

//     switch (node.type) {
//         case 'paragraph':
//             return new Paragraph({ 
//                 children: createTextRuns(node.content),
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }

// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     for (const section of sections) {
        
//         // --- CELL 1: LABEL ---
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 children: [new TextRun({ text: section.label, bold: true })],
//                 spacing: { after: 100, before: 100 } 
//             })],
//             // --- PERBAIKAN: Ganti border menjadi transparan ---
//             borders: fullNoBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 2: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
//         if (tiptapJson && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } else {
//             contentChildren.push(new Paragraph("")); // Konten kosong
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren.length > 0 ? contentChildren : [new Paragraph("")],
//             // --- PERBAIKAN: Ganti border menjadi transparan ---
//             borders: fullNoBorder, 
//             margins: cellMargins,
//         });

//         // --- Buat Baris ---
//         tableRows.push(new TableRow({
//             children: [labelCell, contentCell]
//         }));
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---

// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApprover[] } = {
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         if (grouped[appr.type]) {
//             grouped[appr.type].push(appr);
//         }
//     });

//     // Buat baris header
//     const headerRow = new TableRow({
//         children: [
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data
//     const createDataRows = (type: string, list: JikApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {
//             rows.push(new TableRow({
//                 children: [
//                     // Kolom Tipe (Jabatan) hanya di baris pertama grup
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom Nama
//                     new TableCell({ children: [new Paragraph(appr.name || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [25, 25, 25, 25], // 4 kolom
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
        
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" ? " Tahun" : "";

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: fullNoBorder,
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph(`${valuePrefix}${valText}${valueSuffix}`)],
//                     borders: fullNoBorder,
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), 
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", jikData.contract_duration_years),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, // Disesuaikan agar label lebih lebar
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const jikId = body.jikId; // Ubah dari momId ke jikId

//     if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//     // Ambil data JIK dari database
//     const jikData = await prisma.jik.findUnique({
//       where: { id: parseInt(jikId as string) },
//       include: {
//         company: true, // Untuk nama perusahaan
//         jik_approvers: true, // Ambil approvers JIK
//       },
//     });

//     if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//     // 1. Buat Tabel Lembar Pengesahan
//     const approverTable = createJikApproverTable(jikData.jik_approvers);

//     // 2. Buat Tabel Info JIK (Key-Value)
//     const infoTable = createJikInfoTable(jikData);

//     // 3. Parse Konten Tiptap (document_initiative)
//     const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//     // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
//     const mainContentTable = new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         columnWidths: [4000, 5500], // Disesuaikan agar label lebih lebar
//         rows: [
//             // BARIS 1: Judul "DOKUMEN INISIATIF"
//              new TableRow({
//                 children: [
//                     new TableCell({
//                         children: [new Paragraph({
//                             alignment: AlignmentType.CENTER,
//                             children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })]
//                         })],
//                         columnSpan: 2,
//                         // --- PERBAIKAN: Ganti border menjadi transparan ---
//                         borders: fullNoBorder,
//                         // --- PERBAIKAN: Hilangkan shading abu-abu agar menyatu ---
//                         // shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                         margins: cellMargins,
//                     }),
//                 ]
//             }),
//             // BARIS 2 dst: Section Konten Tiptap
//             ...parsedContentTableRows,
//         ]
//     });


//     // --- Gabungkan Semua Elemen di Dokumen ---
//     const doc = new Document({
//       numbering: numberingConfig, // Pakai ulang config numbering
//       sections: [{
//         // JIK tidak memiliki header berulang seperti MOM
//         headers: { default: new Header({ children: [] }) }, // Header kosong
        
//         // Footer (Boleh pakai ulang)
//         footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
        
//         properties: {
//             page: {
//                 margin: {
//                     top: 1440, 
//                     right: 1440,
//                     bottom: 1440,
//                     left: 1440,
//                 }
//             }
//         },

//         // Urutan anak-anak dokumen
//         children: [
//             // 1. Judul Halaman
//             new Paragraph({
//                 text: "LEMBAR PENGESAHAN",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 200 }
//             }),
            
//             // 2. Tabel Approver
//             approverTable,
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 3. Judul Dokumen
//             new Paragraph({
//                 text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: jikData.judul.toUpperCase(), // Sub-judul
//                 heading: HeadingLevel.HEADING_2,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: `No: ${jikData.no || 'xxx'}`, // Nomor JIK
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 300 }
//             }),

//             // 4. Tabel Info JIK (Key-Value)
//             infoTable,
//             new Paragraph({ text: "", spacing: { after: 200 } }), // Spasi

//             // 5. Tabel Konten Tiptap
//             mainContentTable,

//             // (JIK tidak memiliki "Next Action" atau "Lampiran" seperti MOM di schema)
//         ],
//       }],
//     });

//     // --- Packing dan Kirim ---
//     const buffer = await Packer.toBuffer(doc);
//     const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//     const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//     const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//     return new NextResponse(Uint8Array.from(buffer), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "Content-Disposition": `attachment; filename="${fileName}"`,
//       },
//     });

//   } catch (error: any) {
//     console.error("Error generating JIK DOCX:", error);
//     return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//   }
// }

// // File: src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//   Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// import fs from 'node:fs/promises';
// import path from 'node:path';
// import { Jik, JikApprover } from "@prisma/client"; // Import tipe data

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// const noBorder: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// // (Ini akan mem-parsing Jik.document_initiative)
// interface TiptapNode {
//   type: string;
//   content?: TiptapNode[];
//   text?: string;
//   marks?: { type: string }[];
//   attrs?: { src?: string; align?: 'left' | 'center' | 'right'; [key: string]: any };
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//       alignAttr?: 'left' | 'center' | 'right'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         return AlignmentType.LEFT;
//     };

//     switch (node.type) {
//         case 'paragraph':
//             return new Paragraph({ 
//                 children: createTextRuns(node.content),
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }

// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     for (const section of sections) {
        
//         // --- CELL 1: LABEL ---
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 children: [new TextRun({ text: section.label, bold: true })],
//                 spacing: { after: 100, before: 100 } 
//             })],
//             borders: fullThinBorder, // Gunakan border penuh
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 2: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
//         if (tiptapJson && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } else {
//             contentChildren.push(new Paragraph("")); // Konten kosong
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren.length > 0 ? contentChildren : [new Paragraph("")],
//             borders: fullThinBorder, // Gunakan border penuh
//             margins: cellMargins,
//         });

//         // --- Buat Baris ---
//         tableRows.push(new TableRow({
//             children: [labelCell, contentCell]
//         }));
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---

// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApprover[] } = {
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         if (grouped[appr.type]) {
//             grouped[appr.type].push(appr);
//         }
//     });

//     // Buat baris header
//     const headerRow = new TableRow({
//         children: [
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data
//     const createDataRows = (type: string, list: JikApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {
//             rows.push(new TableRow({
//                 children: [
//                     // Kolom Tipe (Jabatan) hanya di baris pertama grup
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom Nama
//                     new TableCell({ children: [new Paragraph(appr.name || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [25, 25, 25, 25], // 4 kolom
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
        
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" ? " Tahun" : "";

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: fullNoBorder,
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph(`${valuePrefix}${valText}${valueSuffix}`)],
//                     borders: fullNoBorder,
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     // --- PERBAIKAN: Mengubah urutan dan label ---
//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), // Label diubah, data dari initiative_partnership
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", jikData.contract_duration_years),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         // --- PERBAIKAN: Sesuaikan lebar kolom agar 'Nama Inisiatif Kemitraan' pas ---
//         columnWidths: [4000, 5500], // Disesuaikan agar label lebih lebar
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const jikId = body.jikId; // Ubah dari momId ke jikId

//     if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//     // Ambil data JIK dari database
//     const jikData = await prisma.jik.findUnique({
//       where: { id: parseInt(jikId as string) },
//       include: {
//         company: true, // Untuk nama perusahaan
//         jik_approvers: true, // Ambil approvers JIK
//       },
//     });

//     if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//     // 1. Buat Tabel Lembar Pengesahan
//     const approverTable = createJikApproverTable(jikData.jik_approvers);

//     // 2. Buat Tabel Info JIK (Key-Value)
//     const infoTable = createJikInfoTable(jikData);

//     // 3. Parse Konten Tiptap (document_initiative)
//     const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//     // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
//     const mainContentTable = new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         // --- PERBAIKAN: Sesuaikan lebar kolom agar 'Nama Inisiatif Kemitraan' pas ---
//         columnWidths: [4000, 5500], // Disesuaikan agar label lebih lebar
//         rows: [
//             // BARIS 1: Judul "DOKUMEN INISIATIF"
//              new TableRow({
//                 children: [
//                     new TableCell({
//                         children: [new Paragraph({
//                             alignment: AlignmentType.CENTER,
//                             children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })]
//                         })],
//                         columnSpan: 2,
//                         borders: fullThinBorder,
//                         shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                         margins: cellMargins,
//                     }),
//                 ]
//             }),
//             // BARIS 2 dst: Section Konten Tiptap
//             ...parsedContentTableRows,
//         ]
//     });


//     // --- Gabungkan Semua Elemen di Dokumen ---
//     const doc = new Document({
//       numbering: numberingConfig, // Pakai ulang config numbering
//       sections: [{
//         // JIK tidak memiliki header berulang seperti MOM
//         headers: { default: new Header({ children: [] }) }, // Header kosong
        
//         // Footer (Boleh pakai ulang)
//         footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
        
//         properties: {
//             page: {
//                 margin: {
//                     top: 1440, 
//                     right: 1440,
//                     bottom: 1440,
//                     left: 1440,
//                 }
//             }
//         },

//         // Urutan anak-anak dokumen
//         children: [
//             // 1. Judul Halaman
//             new Paragraph({
//                 text: "LEMBAR PENGESAHAN",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 200 }
//             }),
            
//             // 2. Tabel Approver
//             approverTable,
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 3. Judul Dokumen
//             new Paragraph({
//                 text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: jikData.judul.toUpperCase(), // Sub-judul
//                 heading: HeadingLevel.HEADING_2,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: `No: ${jikData.no || 'xxx'}`, // Nomor JIK
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 300 }
//             }),

//             // 4. Tabel Info JIK (Key-Value)
//             infoTable,
//             new Paragraph({ text: "", spacing: { after: 200 } }), // Spasi

//             // 5. Tabel Konten Tiptap
//             mainContentTable,

//             // (JIK tidak memiliki "Next Action" atau "Lampiran" seperti MOM di schema)
//         ],
//       }],
//     });

//     // --- Packing dan Kirim ---
//     const buffer = await Packer.toBuffer(doc);
//     const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//     const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//     const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//     return new NextResponse(Uint8Array.from(buffer), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "Content-Disposition": `attachment; filename="${fileName}"`,
//       },
//     });

//   } catch (error: any) {
//     console.error("Error generating JIK DOCX:", error);
//     return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//   }
// }

// // File: src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//   Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// import fs from 'node:fs/promises';
// import path from 'node:path';
// import { Jik, JikApprover } from "@prisma/client"; // Import tipe data

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// const noBorder: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// // --- PERBAIKAN: Definisikan border transparan penuh ---
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// // (Ini akan mem-parsing Jik.document_initiative)
// interface TiptapNode {
//   type: string;
//   content?: TiptapNode[];
//   text?: string;
//   marks?: { type: string }[];
//   attrs?: { src?: string; align?: 'left' | 'center' | 'right'; [key: string]: any };
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//       alignAttr?: 'left' | 'center' | 'right'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         return AlignmentType.LEFT;
//     };

//     switch (node.type) {
//         case 'paragraph':
//             return new Paragraph({ 
//                 children: createTextRuns(node.content),
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }

// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     for (const section of sections) {
        
//         // --- CELL 1: LABEL ---
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 children: [new TextRun({ text: section.label, bold: true })],
//                 spacing: { after: 100, before: 100 } 
//             })],
//             borders: fullThinBorder, // Gunakan border penuh
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 2: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
//         if (tiptapJson && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } else {
//             contentChildren.push(new Paragraph("")); // Konten kosong
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren.length > 0 ? contentChildren : [new Paragraph("")],
//             borders: fullThinBorder, // Gunakan border penuh
//             margins: cellMargins,
//         });

//         // --- Buat Baris ---
//         tableRows.push(new TableRow({
//             children: [labelCell, contentCell]
//         }));
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---

// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApprover[] } = {
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         if (grouped[appr.type]) {
//             grouped[appr.type].push(appr);
//         }
//     });

//     // Buat baris header
//     const headerRow = new TableRow({
//         children: [
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data
//     const createDataRows = (type: string, list: JikApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {
//             rows.push(new TableRow({
//                 children: [
//                     // Kolom Tipe (Jabatan) hanya di baris pertama grup
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom Nama
//                     new TableCell({ children: [new Paragraph(appr.name || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [25, 25, 25, 25], // 4 kolom
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
        
//         // --- PERBAIKAN: Gunakan ': ' untuk data, atau ' Tahun' untuk durasi ---
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" ? " Tahun" : "";

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     // --- PERBAIKAN: Gunakan border transparan ---
//                     borders: fullNoBorder,
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     // --- PERBAIKAN: Sesuaikan format value ---
//                     children: [new Paragraph(`${valuePrefix}${valText}${valueSuffix}`)],
//                     // --- PERBAIKAN: Gunakan border transparan ---
//                     borders: fullNoBorder,
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         // --- PERBAIKAN: Hilangkan Nama Inisiatif dan Nama ---
//         // createInfoRow("Nama Inisiatif Kemitraan", jikData.judul),
//         // createInfoRow("Nama", jikData.nama),
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         createInfoRow("Initiative Partnership", jikData.initiative_partnership),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", jikData.contract_duration_years),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [3000, 6500], // Set lebar kolom
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const jikId = body.jikId; // Ubah dari momId ke jikId

//     if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//     // Ambil data JIK dari database
//     const jikData = await prisma.jik.findUnique({
//       where: { id: parseInt(jikId as string) },
//       include: {
//         company: true, // Untuk nama perusahaan
//         jik_approvers: true, // Ambil approvers JIK
//       },
//     });

//     if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//     // 1. Buat Tabel Lembar Pengesahan
//     const approverTable = createJikApproverTable(jikData.jik_approvers);

//     // 2. Buat Tabel Info JIK (Key-Value)
//     const infoTable = createJikInfoTable(jikData);

//     // 3. Parse Konten Tiptap (document_initiative)
//     const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//     // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
//     const mainContentTable = new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         columnWidths: [3000, 6500], // Sekitar 30% / 70%
//         rows: [
//             // BARIS 1: Judul "DOKUMEN INISIATIF"
//              new TableRow({
//                 children: [
//                     new TableCell({
//                         children: [new Paragraph({
//                             alignment: AlignmentType.CENTER,
//                             children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })]
//                         })],
//                         columnSpan: 2,
//                         borders: fullThinBorder,
//                         shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                         margins: cellMargins,
//                     }),
//                 ]
//             }),
//             // BARIS 2 dst: Section Konten Tiptap
//             ...parsedContentTableRows,
//         ]
//     });


//     // --- Gabungkan Semua Elemen di Dokumen ---
//     const doc = new Document({
//       numbering: numberingConfig, // Pakai ulang config numbering
//       sections: [{
//         // JIK tidak memiliki header berulang seperti MOM
//         headers: { default: new Header({ children: [] }) }, // Header kosong
        
//         // Footer (Boleh pakai ulang)
//         footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
        
//         properties: {
//             page: {
//                 margin: {
//                     top: 1440, 
//                     right: 1440,
//                     bottom: 1440,
//                     left: 1440,
//                 }
//             }
//         },

//         // Urutan anak-anak dokumen
//         children: [
//             // 1. Judul Halaman
//             new Paragraph({
//                 text: "LEMBAR PENGESAHAN",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 200 }
//             }),
            
//             // 2. Tabel Approver
//             approverTable,
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 3. Judul Dokumen
//             new Paragraph({
//                 text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: jikData.judul.toUpperCase(), // Sub-judul
//                 heading: HeadingLevel.HEADING_2,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: `No: ${jikData.no || 'xxx'}`, // Nomor JIK
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 300 }
//             }),

//             // 4. Tabel Info JIK (Key-Value)
//             infoTable,
//             new Paragraph({ text: "", spacing: { after: 200 } }), // Spasi

//             // 5. Tabel Konten Tiptap
//             mainContentTable,

//             // (JIK tidak memiliki "Next Action" atau "Lampiran" seperti MOM di schema)
//         ],
//       }],
//     });

//     // --- Packing dan Kirim ---
//     const buffer = await Packer.toBuffer(doc);
//     const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//     const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//     const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//     return new NextResponse(Uint8Array.from(buffer), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "Content-Disposition": `attachment; filename="${fileName}"`,
//       },
//     });

//   } catch (error: any) {
//     console.error("Error generating JIK DOCX:", error);
//     return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//   }
// }

// // File: src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//   Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// import fs from 'node:fs/promises';
// import path from 'node:path';
// import { Jik, JikApprover } from "@prisma/client"; // Import tipe data

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// const noBorder: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// // --- PERBAIKAN: Definisikan border penuh di scope global ---
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// // (Ini akan mem-parsing Jik.document_initiative)
// interface TiptapNode {
//   type: string;
//   content?: TiptapNode[];
//   text?: string;
//   marks?: { type: string }[];
//   attrs?: { src?: string; align?: 'left' | 'center' | 'right'; [key: string]: any };
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//       alignAttr?: 'left' | 'center' | 'right'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         return AlignmentType.LEFT;
//     };

//     switch (node.type) {
//         case 'paragraph':
//             return new Paragraph({ 
//                 children: createTextRuns(node.content),
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }

// // --- PERBAIKAN: Fungsi ini sekarang mengembalikan TableRow[] ---
// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     for (const section of sections) {
        
//         // --- CELL 1: LABEL ---
//         // Sesuai gambar image_2661c0.png, kolom pertama adalah label
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 children: [new TextRun({ text: section.label, bold: true })],
//                 spacing: { after: 100, before: 100 } 
//             })],
//             borders: fullThinBorder, // Gunakan border penuh
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, // Ratakan label ke atas
//         });

//         // --- CELL 2: CONTENT ---
//         // Sesuai gambar image_2661c0.png, kolom kedua adalah konten Tiptap
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
//         if (tiptapJson && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } else {
//             contentChildren.push(new Paragraph("")); // Konten kosong
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren.length > 0 ? contentChildren : [new Paragraph("")],
//             borders: fullThinBorder, // Gunakan border penuh
//             margins: cellMargins,
//         });

//         // --- Buat Baris ---
//         // Masukkan kedua sel ke dalam satu baris
//         tableRows.push(new TableRow({
//             children: [labelCell, contentCell]
//         }));
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---

// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApprover[] } = {
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         if (grouped[appr.type]) {
//             grouped[appr.type].push(appr);
//         }
//     });

//     // Buat baris header
//     const headerRow = new TableRow({
//         children: [
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data
//     const createDataRows = (type: string, list: JikApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {
//             rows.push(new TableRow({
//                 children: [
//                     // Kolom Tipe (Jabatan) hanya di baris pertama grup
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom Nama
//                     new TableCell({ children: [new Paragraph(appr.name || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [25, 25, 25, 25], // 4 kolom
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     // --- PERBAIKAN: Gunakan border penuh ---
//                     borders: fullThinBorder,
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph(`: ${valText}`)],
//                     // --- PERBAIKAN: Gunakan border penuh ---
//                     borders: fullThinBorder,
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.judul),
//         createInfoRow("Nama", jikData.nama),
//         // --- PERBAIKAN: Ganti "Nama Unit" menjadi "Unit Kerja Pelaksana" sesuai template ---
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         createInfoRow("Initiative Partnership", jikData.initiative_partnership),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", `${jikData.contract_duration_years || ''} Tahun`),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [3000, 6500], // Set lebar kolom
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const jikId = body.jikId; // Ubah dari momId ke jikId

//     if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//     // Ambil data JIK dari database
//     const jikData = await prisma.jik.findUnique({
//       where: { id: parseInt(jikId as string) },
//       include: {
//         company: true, // Untuk nama perusahaan
//         jik_approvers: true, // Ambil approvers JIK
//       },
//     });

//     if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//     // 1. Buat Tabel Lembar Pengesahan
//     const approverTable = createJikApproverTable(jikData.jik_approvers);

//     // 2. Buat Tabel Info JIK (Key-Value)
//     const infoTable = createJikInfoTable(jikData);

//     // 3. Parse Konten Tiptap (document_initiative)
//     // --- PERBAIKAN: Ganti nama variabel agar jelas ---
//     const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//     // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
//     const mainContentTable = new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         // --- PERBAIKAN: Definisikan lebar kolom agar konsisten ---
//         columnWidths: [3000, 6500], // Sekitar 30% / 70%
//         rows: [
//             // BARIS 1: Judul "DOKUMEN INISIATIF" (sesuai image_2661c0.png)
//              new TableRow({
//                 children: [
//                     new TableCell({
//                         children: [new Paragraph({
//                             alignment: AlignmentType.CENTER,
//                             // --- PERBAIKAN: Ganti judul ---
//                             children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })]
//                         })],
//                         columnSpan: 2,
//                         borders: fullThinBorder,
//                         shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                         margins: cellMargins,
//                     }),
//                 ]
//             }),
//             // BARIS 2 dst: Section Konten Tiptap
//             // --- PERBAIKAN: Langsung masukkan baris yang sudah jadi ---
//             ...parsedContentTableRows,
//         ]
//     });


//     // --- Gabungkan Semua Elemen di Dokumen ---
//     const doc = new Document({
//       numbering: numberingConfig, // Pakai ulang config numbering
//       sections: [{
//         // JIK tidak memiliki header berulang seperti MOM
//         headers: { default: new Header({ children: [] }) }, // Header kosong
        
//         // Footer (Boleh pakai ulang)
//         footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
        
//         properties: {
//             page: {
//                 margin: {
//                     top: 1440, 
//                     right: 1440,
//                     bottom: 1440,
//                     left: 1440,
//                 }
//             }
//         },

//         // Urutan anak-anak dokumen
//         children: [
//             // 1. Judul Halaman
//             new Paragraph({
//                 text: "LEMBAR PENGESAHAN",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 200 }
//             }),
            
//             // 2. Tabel Approver
//             approverTable,
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 3. Judul Dokumen
//             new Paragraph({
//                 text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: jikData.judul.toUpperCase(), // Sub-judul
//                 heading: HeadingLevel.HEADING_2,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: `No: ${jikData.no || 'xxx'}`, // Nomor JIK
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 300 }
//             }),

//             // 4. Tabel Info JIK (Key-Value)
//             infoTable,
//             new Paragraph({ text: "", spacing: { after: 200 } }), // Spasi

//             // 5. Tabel Konten Tiptap
//             mainContentTable,

//             // (JIK tidak memiliki "Next Action" atau "Lampiran" seperti MOM di schema)
//         ],
//       }],
//     });

//     // --- Packing dan Kirim ---
//     const buffer = await Packer.toBuffer(doc);
//     const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//     const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//     const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//     return new NextResponse(Uint8Array.from(buffer), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "Content-Disposition": `attachment; filename="${fileName}"`,
//       },
//     });

//   } catch (error: any) {
//     console.error("Error generating JIK DOCX:", error);
//     return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//   }
// }

// // File: src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//   Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// import fs from 'node:fs/promises';
// import path from 'node:path';
// import { Jik, JikApprover } from "@prisma/client"; // Import tipe data

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// const noBorder: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };

// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// // (Ini akan mem-parsing Jik.document_initiative)
// interface TiptapNode {
//   type: string;
//   content?: TiptapNode[];
//   text?: string;
//   marks?: { type: string }[];
//   attrs?: { src?: string; align?: 'left' | 'center' | 'right'; [key: string]: any };
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//       alignAttr?: 'left' | 'center' | 'right'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         return AlignmentType.LEFT;
//     };

//     switch (node.type) {
//         case 'paragraph':
//             return new Paragraph({ 
//                 children: createTextRuns(node.content),
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }

// async function parseTiptapContent(sections: any[]): Promise<TableCell[]> {
//     const tableCells: TableCell[] = [];
//     if (!Array.isArray(sections)) { return tableCells; }
    
//     for (const section of sections) {
//         const sectionChildren: (Paragraph | Table)[] = [];
        
//         // Buat Label (misal: "1. Latar Belakang")
//         sectionChildren.push(new Paragraph({ 
//             children: [new TextRun({ text: section.label, bold: true })], 
//             spacing: { after: 100, before: 100 } 
//         }));

//         // Parse Konten Tiptap
//         const tiptapJson = section.content as TiptapNode;
//         if (tiptapJson && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         sectionChildren.push(...docxElement);
//                     } else {
//                         sectionChildren.push(docxElement);
//                     }
//                 }
//             }
//         } else {
//             sectionChildren.push(new Paragraph("")); // Konten kosong
//         }

//         // Masukkan ke TableCell (agar sesuai dengan struktur tabel utama)
//         tableCells.push(new TableCell({
//             children: sectionChildren,
//             borders: { top: noBorder, left: thinBlackBorder, bottom: noBorder, right: thinBlackBorder },
//             columnSpan: 2, // Sesuai dengan tabel info JIK
//             margins: cellMargins,
//         }));
//     }
//     return tableCells;
// }
// // --- AKHIR PARSER TIPTAP ---

// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApprover[] } = {
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         if (grouped[appr.type]) {
//             grouped[appr.type].push(appr);
//         }
//     });

//     // Tentukan border penuh
//     const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };

//     // Buat baris header
//     const headerRow = new TableRow({
//         children: [
//             // --- PERBAIKAN 1 ---
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // --- PERBAIKAN 2 ---
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // --- PERBAIKAN 3 ---
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // --- PERBAIKAN 4 ---
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data
//     const createDataRows = (type: string, list: JikApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong
//             rows.push(new TableRow({
//                 children: [
//                     // --- PERBAIKAN 5 ---
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // --- PERBAIKAN 6 ---
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     // --- PERBAIKAN 7 ---
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     // --- PERBAIKAN 8 ---
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {
//             rows.push(new TableRow({
//                 children: [
//                     // Kolom Tipe (Jabatan) hanya di baris pertama grup
//                     // --- PERBAIKAN 9 ---
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom Nama
//                     // --- PERBAIKAN 10 ---
//                     new TableCell({ children: [new Paragraph(appr.name || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     // Kolom TTD (Kosong)
//                     // --- PERBAIKAN 11 ---
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom Catatan (Kosong)
//                     // --- PERBAIKAN 12 ---
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [25, 25, 25, 25], // 4 kolom
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: { top: noBorder, left: thinBlackBorder, bottom: noBorder, right: noBorder },
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph(`: ${valText}`)],
//                     borders: { top: noBorder, left: noBorder, bottom: noBorder, right: thinBlackBorder },
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.judul),
//         createInfoRow("Nama", jikData.nama),
//         createInfoRow("Nama Unit", jikData.nama_unit),
//         createInfoRow("Initiative Partnership", jikData.initiative_partnership),
//         createInfoRow("Investment Value", jikData.invest_value),
//         createInfoRow("Contract Duration", `${jikData.contract_duration_years || ''} Tahun`),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const jikId = body.jikId; // Ubah dari momId ke jikId

//     if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//     // Ambil data JIK dari database
//     const jikData = await prisma.jik.findUnique({
//       where: { id: parseInt(jikId as string) },
//       include: {
//         company: true, // Untuk nama perusahaan
//         jik_approvers: true, // Ambil approvers JIK
//       },
//     });

//     if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//     // 1. Buat Tabel Lembar Pengesahan
//     const approverTable = createJikApproverTable(jikData.jik_approvers);

//     // 2. Buat Tabel Info JIK (Key-Value)
//     const infoTable = createJikInfoTable(jikData);

//     // 3. Parse Konten Tiptap (document_initiative)
//     const parsedContentTableCells = await parseTiptapContent(jikData.document_initiative as any[] || []);

//     // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
//     const mainContentTable = new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: [
//             // BARIS 1: Judul "Description" (Mirip MOM, tapi kita pakai untuk konten)
//              new TableRow({
//                 children: [
//                     new TableCell({
//                         children: [new Paragraph({
//                             alignment: AlignmentType.CENTER,
//                             children: [new TextRun({ text: "Description", bold: true })]
//                         })],
//                         columnSpan: 2,
//                         borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                         shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                         margins: cellMargins,
//                     }),
//                 ]
//             }),
//             // BARIS 2 dst: Section Konten Tiptap
//             ...parsedContentTableCells.map(cell => new TableRow({ children: [cell] })),
//         ]
//     });


//     // --- Gabungkan Semua Elemen di Dokumen ---
//     const doc = new Document({
//       numbering: numberingConfig, // Pakai ulang config numbering
//       sections: [{
//         // JIK tidak memiliki header berulang seperti MOM
//         headers: { default: new Header({ children: [] }) }, // Header kosong
        
//         // Footer (Boleh pakai ulang)
//         footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
        
//         properties: {
//             page: {
//                 margin: {
//                     top: 1440, 
//                     right: 1440,
//                     bottom: 1440,
//                     left: 1440,
//                 }
//             }
//         },

//         // Urutan anak-anak dokumen
//         children: [
//             // 1. Judul Halaman
//             new Paragraph({
//                 text: "LEMBAR PENGESAHAN",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 200 }
//             }),
            
//             // 2. Tabel Approver
//             approverTable,
//             new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//             // 3. Judul Dokumen
//             new Paragraph({
//                 text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)",
//                 heading: HeadingLevel.HEADING_1,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: jikData.judul.toUpperCase(), // Sub-judul
//                 heading: HeadingLevel.HEADING_2,
//                 alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//                 text: `No: ${jikData.no || 'xxx'}`, // Nomor JIK
//                 alignment: AlignmentType.CENTER,
//                 spacing: { after: 300 }
//             }),

//             // 4. Tabel Info JIK (Key-Value)
//             infoTable,
//             new Paragraph({ text: "", spacing: { after: 200 } }), // Spasi

//             // 5. Tabel Konten Tiptap
//             mainContentTable,

//             // (JIK tidak memiliki "Next Action" atau "Lampiran" seperti MOM di schema)
//         ],
//       }],
//     });

//     // --- Packing dan Kirim ---
//     const buffer = await Packer.toBuffer(doc);
//     const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//     const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//     const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//     return new NextResponse(Uint8Array.from(buffer), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "Content-Disposition": `attachment; filename="${fileName}"`,
//       },
//     });

//   } catch (error: any) {
//     console.error("Error generating JIK DOCX:", error);
//     return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//   }
// }
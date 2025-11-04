"use client"

import { useState } from 'react';

// Header Component
function MomHeader() {
  return (
    <div style={{ width: '595px', fontSize: '10pt', fontFamily: 'Arial, sans-serif', border: '1px solid rgb(107, 114, 128)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td rowSpan={2} style={{ width: '25%', border: '1px solid rgb(107, 114, 128)', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
              <div style={{ margin: '0 auto', height: '40px', background: 'rgb(229, 231, 235)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                Logo
              </div>
            </td>
            <td style={{ width: '50%', border: '1px solid rgb(107, 114, 128)', textAlign: 'center', padding: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase' }}>MINUTE OF MEETING</div>
              <div style={{ fontSize: '9pt' }}>
                Joint Planning Session <span style={{ color: 'rgb(229, 57, 53)', fontWeight: '600' }}>Telkomsat</span> & LEN
              </div>
            </td>
            <td rowSpan={2} style={{ width: '25%', border: '1px solid rgb(107, 114, 128)', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
              <div style={{ margin: '0 auto', height: '40px', background: 'rgb(229, 231, 235)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                Logo
              </div>
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid rgb(107, 114, 128)', padding: '8px' }}>
              <table style={{ width: '100%', fontSize: '9pt' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '60px', fontWeight: '600' }}>Date</td>
                    <td style={{ width: '10px', textAlign: 'center' }}>:</td>
                    <td>23 September 2025</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Time</td>
                    <td style={{ textAlign: 'center' }}>:</td>
                    <td>09.00 - 14.00</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Venue</td>
                    <td style={{ textAlign: 'center' }}>:</td>
                    <td>RR 1B <span style={{ color: 'rgb(229, 57, 53)', fontWeight: '600' }}>Telkomsat</span></td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Description Component
function MomDescription() {
  return (
    <div style={{ width: '595px', fontSize: '10pt', fontFamily: 'Arial, sans-serif', border: '1px solid black', marginTop: '8px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ width: '20%', border: '1px solid black', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
              <p style={{ margin: 0 }}>Attendees</p>
            </td>
            <td style={{ width: '80%', border: '1px solid black', padding: '8px' }}>
              <div style={{ fontSize: '10pt' }}>John Doe (Telkomsat), Jane Smith (LEN), Bob Wilson (Telkomsat), Alice Brown (Telkomsat), Charlie Green (LEN)</div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'center', padding: '8px' }}>
              <p style={{ margin: 0, fontSize: '9pt' }}>Result</p>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ background: 'rgb(209, 213, 219)', border: '1px solid black', fontWeight: 'bold', textAlign: 'center', padding: '8px' }}>
              <p style={{ margin: 0, fontSize: '9pt' }}>Description</p>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ border: '1px solid black', padding: '8px' }}>
              <p style={{ fontWeight: 'bold', margin: '0 0 8px 0' }}>Latar Belakang</p>
              <ol style={{ marginLeft: '32px', paddingLeft: 0 }}>
                <li style={{ marginBottom: '4px' }}>Kerjasama strategis antara Telkomsat dan LEN untuk pengembangan teknologi satelit yang inovatif dan berkelanjutan.</li>
                <li style={{ marginBottom: '4px' }}>Identifikasi 13 project initiative yang potensial untuk dikembangkan bersama dalam rangka memperkuat posisi di industri pertahanan.</li>
                <li style={{ marginBottom: '4px' }}>Fokus pada solusi yang siap digunakan (ready-to-use) dan mission-based approach untuk memenuhi kebutuhan pelanggan.</li>
                <li style={{ marginBottom: '4px' }}>Sinergi kompetensi kedua perusahaan dalam bidang teknologi pertahanan dan komunikasi satelit untuk menciptakan nilai tambah.</li>
                <li style={{ marginBottom: '4px' }}>Komitmen untuk mempercepat time-to-market produk inovatif dengan memanfaatkan kekuatan masing-masing organisasi.</li>
                <li style={{ marginBottom: '4px' }}>Pentingnya kolaborasi dalam menghadapi tantangan pasar yang semakin kompetitif dan dinamis.</li>
                <li style={{ marginBottom: '4px' }}>Kebutuhan untuk mengembangkan roadmap bersama yang jelas dan terukur untuk periode 2025-2027.</li>
              </ol>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ border: '1px solid black', padding: '8px' }}>
              <p style={{ fontWeight: 'bold', margin: '0 0 8px 0' }}>Pembahasan</p>
              <ol style={{ marginLeft: '64px', paddingLeft: 0, listStyleType: 'lower-alpha' }}>
                <li style={{ marginBottom: '4px' }}>Review mendalam terhadap 13 project initiative yang telah diidentifikasi sebelumnya oleh tim teknis dari kedua perusahaan.</li>
                <li style={{ marginBottom: '4px' }}>Evaluasi komprehensif kesiapan teknologi (TRL) dan market readiness masing-masing project untuk memastikan kesuksesan implementasi.</li>
                <li style={{ marginBottom: '4px' }}>Penentuan kriteria seleksi project prioritas dengan fokus pada ready-to-use solutions yang memiliki potensi revenue tinggi.</li>
                <li style={{ marginBottom: '4px' }}>Diskusi detail mengenai resource allocation, baik SDM maupun budget, serta timeline implementasi yang realistis.</li>
                <li style={{ marginBottom: '4px' }}>Penetapan milestone kunci dan deliverables yang terukur untuk setiap project yang dipilih sebagai prioritas.</li>
                <li style={{ marginBottom: '4px' }}>Pembahasan mengenai risk mitigation strategy dan contingency plan untuk mengantisipasi kendala yang mungkin muncul.</li>
                <li style={{ marginBottom: '4px' }}>Diskusi mekanisme governance dan decision-making process untuk memastikan kolaborasi berjalan efektif.</li>
                <li style={{ marginBottom: '4px' }}>Review terhadap existing partnership agreement dan identifikasi area-area yang perlu diperkuat atau direvisi.</li>
              </ol>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ border: '1px solid black', padding: '8px' }}>
              <p style={{ fontWeight: 'bold', margin: '0 0 8px 0' }}>Next Action</p>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <td style={{ width: '6%', border: '1px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>No</td>
                    <td style={{ width: '40%', border: '1px solid black', padding: '8px', fontWeight: 'bold' }}>Action</td>
                    <td style={{ width: '27%', border: '1px solid black', padding: '8px', fontWeight: 'bold' }}>Due Date</td>
                    <td style={{ width: '27%', border: '1px solid black', padding: '8px', fontWeight: 'bold' }}>UIC</td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid black', textAlign: 'center' }}>1.</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>Seleksi terhadap 13 project initiative dengan fokus pada solusi yang siap digunakan (ready to use) dan berorientasi pada mission based</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>3 Oktober 2025</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>Telkomsat, LEN</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid black', textAlign: 'center' }}>2.</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>Finalisasi proposal teknis dan komersial untuk 5 project terpilih dengan detail spesifikasi lengkap</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>15 Oktober 2025</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>Tim Teknis</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid black', textAlign: 'center' }}>3.</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>Presentasi hasil seleksi kepada management kedua perusahaan untuk mendapatkan approval</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>20 Oktober 2025</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>Project Manager</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid black', textAlign: 'center' }}>4.</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>Penyusunan detailed project plan termasuk Gantt chart dan resource allocation matrix</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>30 Oktober 2025</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>PMO Team</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid black', textAlign: 'center' }}>5.</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>Kick-off meeting untuk project implementation phase dengan seluruh stakeholder terkait</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>5 November 2025</td>
                    <td style={{ padding: '8px', border: '1px solid black' }}>All Teams</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Attachment Component
function MomAttachmentSection() {
  return (
    <div style={{ width: '595px', fontSize: '10pt', fontFamily: 'Arial, sans-serif', border: '1px solid black', marginTop: '8px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ padding: '8px' }}>
              <p style={{ fontWeight: 'bold', margin: '0 0 8px 0' }}>Lampiran</p>
              <ol style={{ marginLeft: '32px', paddingLeft: 0 }}>
                <li style={{ marginBottom: '4px' }}>Dokumentasi kegiatan meeting berupa foto-foto sesi diskusi dan video rekaman presentasi lengkap</li>
                <li style={{ marginBottom: '4px' }}>Materi presentasi Joint Planning Session Telkomsat dan LEN dalam format PDF dan PowerPoint</li>
                <li style={{ marginBottom: '4px' }}>Daftar lengkap 13 project initiative beserta deskripsi singkat dan assessment awal</li>
                <li style={{ marginBottom: '4px' }}>Technical specification document untuk setiap project termasuk arsitektur sistem dan requirements</li>
                <li style={{ marginBottom: '4px' }}>Budget estimation dan financial projection untuk masing-masing project initiative</li>
                <li style={{ marginBottom: '4px' }}>Risk assessment matrix dan mitigation strategies untuk setiap identified risk</li>
                <li style={{ marginBottom: '4px' }}>Draft partnership agreement revision dengan highlight pada perubahan-perubahan kunci</li>
                <li style={{ marginBottom: '4px' }}>Organization chart untuk project governance structure dan decision-making flow</li>
              </ol>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Footer Component
function MomFooter({ pageNum = 1 }) {
  return (
    <div style={{ width: '595px', fontSize: '10pt', fontFamily: 'Arial, sans-serif', border: '1px solid black', marginTop: '8px' }}>
      <div style={{ textAlign: 'right', padding: '8px' }}>
        <p style={{ margin: 0 }}>Page {pageNum}</p>
      </div>
    </div>
  );
}

// Main Component
export default function Test() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');

  const handleDownload = async () => {
    setIsGenerating(true);
    setProgress('Loading libraries...');
    
    try {
      const { default: jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      // ... (Pengambilan elemen tetap sama)
      
      // Menggunakan A4 dan unit 'pt' (points)
      const pdf = new jsPDF('p', 'pt', 'a4'); 
      const pageWidth = pdf.internal.pageSize.getWidth(); // ~595.28 pt
      const pageHeight = pdf.internal.pageSize.getHeight(); // ~841.89 pt
      
      // Margin 0.5 inci = 36 pt (72 points per inch)
      const margin = 36; 
      
      // Lebar konten target: Lebar halaman dikurangi margin kiri-kanan
      const targetContentWidthPt = pageWidth - (2 * margin); // Target 523.28 pt
      
      const canvasOptions = {
        scale: 2, // Tetap gunakan scale 2
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        // Hapus windowWidth untuk mengandalkan lebar 595px dari CSS
      };
      
      // --- Capture Header ---
      setProgress('Capturing header...');
      const headerCanvas = await html2canvas(header, canvasOptions);
      const headerImgData = headerCanvas.toDataURL('image/png');
      // Hitung tinggi dalam PT berdasarkan rasio aspek dan lebar target PT
      // CATATAN: headerCanvas.width mungkin sekitar 1190px (595px * scale 2)
      const headerHeightPt = (headerCanvas.height * targetContentWidthPt) / headerCanvas.width; 
      
      // --- Capture Footer ---
      setProgress('Capturing footer...');
      const footerCanvas = await html2canvas(footer, canvasOptions);
      const footerImgData = footerCanvas.toDataURL('image/png');
      const footerHeightPt = (footerCanvas.height * targetContentWidthPt) / footerCanvas.width;

      // --- Capture Main Content ---
      setProgress('Capturing main content...');
      const canvas = await html2canvas(bodyContent, canvasOptions);
      const imgHeightPt = (canvas.height * targetContentWidthPt) / canvas.width;
      
      // --- Multi-Page Logic ---
      
      // Ruang yang tersedia untuk konten per halaman
      const availableHeightPt = pageHeight - headerHeightPt - footerHeightPt - (2 * margin) - 10; 
      
      const headerY = margin;
      const contentY = headerY + headerHeightPt + 5; // Tambah sedikit padding vertikal
      const footerY = pageHeight - footerHeightPt - margin;
      
      let remainingHeight = imgHeightPt;
      let currentPosition = 0;
      let pageCount = 0;
      
      setProgress('Generating PDF pages...');
      
      // Generate pages
      while (remainingHeight > 0) {
        pageCount++;
        
        if (pageCount > 1) {
          pdf.addPage();
        }
        
        setProgress(`Generating page ${pageCount}...`);
        
        // Add header to every page
        const contentX = margin; // Konten dimulai dari margin
        pdf.addImage(headerImgData, 'PNG', contentX, headerY, targetContentWidthPt, headerHeightPt);
        
        // Calculate slice height for this page
        const sliceHeightPt = Math.min(availableHeightPt, remainingHeight);
        
        // Perhitungan sourceY dan sourceHeight dalam pixel tetap sama
        const sourceY_px = (canvas.height * currentPosition) / imgHeightPt;
        const sourceHeight_px = (canvas.height * sliceHeightPt) / imgHeightPt;
        
        // ... (Logika slicing canvas tetap sama)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = sourceHeight_px;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, sourceY_px, canvas.width, sourceHeight_px, 0, 0, canvas.width, sourceHeight_px);
        const sliceImgData = tempCanvas.toDataURL('image/png');
        
        // Add image slice ke PDF
        pdf.addImage(sliceImgData, 'PNG', contentX, contentY, targetContentWidthPt, sliceHeightPt);
        
        // Add footer to every page
        pdf.addImage(footerImgData, 'PNG', contentX, footerY, targetContentWidthPt, footerHeightPt);
        
        // Add page number 
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${pageCount}`, contentX + targetContentWidthPt - 50, footerY + footerHeightPt / 2 + 3);
        
        currentPosition += sliceHeightPt;
        remainingHeight -= sliceHeightPt;
      }
      
      // ... (Bagian saving PDF dan error handling)
      
    } catch (error) {
      // ...
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'rgb(243, 244, 246)', padding: '32px' }}>
      <div style={{ maxWidth: '896px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            style={{
              padding: '12px 24px',
              background: isGenerating ? 'rgb(156, 163, 175)' : 'rgb(22, 163, 74)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => !isGenerating && (e.target.style.background = 'rgb(21, 128, 61)')}
            onMouseOut={(e) => !isGenerating && (e.target.style.background = 'rgb(22, 163, 74)')}
          >
            {isGenerating ? progress || 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>

        {/* PDF Preview Container */}
        <div style={{ background: 'white', padding: '32px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
          <div id="pdf-content" style={{ maxWidth: '595px', margin: '0 auto' }}>
            {/* Header - will be on every page */}
            <div id="pdf-header">
              <MomHeader />
            </div>

            {/* Main Content - Description + Attachment together */}
            <div id="pdf-body-content">
              <MomDescription />
              <MomAttachmentSection />
            </div>

            {/* Footer - will be on every page */}
            <div id="pdf-footer">
              <MomFooter pageNum={1} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
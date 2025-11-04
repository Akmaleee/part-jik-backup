"use client";

import Image from "next/image";

export default function MomAttachmentSection() {
  return (
    <div className="w-[595px] text-[10pt] font-sans border border-black">
      <table className="w-full border-collapse">
        <tbody>
          {/* Lampiran */}
          <tr>
            <td className="w-full p-2">
              <p className="font-bold">Lampiran</p>
              <ol className="ml-8 list-decimal">
                <li>Kegiatan Meeting</li>
                
                <li>Materi Join Planning session Telkomsat dan LEN</li>
                
              </ol>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

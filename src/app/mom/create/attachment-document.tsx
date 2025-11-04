"use client";

import { Button } from "@/components/ui/button";
import { MomForm } from "./page";

interface Section {
  sectionName: string;
  // Terima 'any' untuk file lama (objek) dan file baru (File)
  files: any[]; 
}

interface AttachmentDocumentProps {
  sections: Section[];
  handleChange: <K extends keyof MomForm>(field: K, value: MomForm[K]) => void;
}

export default function AttachmentDocument({ sections, handleChange }: AttachmentDocumentProps) {

  // Tambah section baru
  const handleAddSection = () => {
    handleChange("attachments", [...sections, { sectionName: "", files: [] }]);
  }

  // Hapus section
  const handleRemoveSection = (index: number) => {
    handleChange("attachments", sections.filter((_, i) => i !== index));
  }

  // Ubah nama section
  const handleSectionNameChange = (index: number, value: string) => {
    const updated = [...sections];
    updated[index].sectionName = value;
    handleChange("attachments", updated);
  }

  // Tambah file ke section
  const handleFileChange = (index: number, newFiles: FileList | null) => {
    if (!newFiles) return;
    const updated = [...sections];
    updated[index].files = [...updated[index].files, ...Array.from(newFiles)];
    handleChange("attachments", updated);
  }

  // Hapus file tertentu
  const handleRemoveFile = (sectionIndex: number, fileIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].files.splice(fileIndex, 1);
    handleChange("attachments", updated);
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-900 mb-6">Attachments</h2>
      <div className="space-y-6">
        {sections.map((section, index) => (
          <div key={index} className="border rounded-xl p-4 shadow-sm space-y-3">
            {/* Section name */}
            <input
              type="text"
              placeholder="Section Name"
              value={section.sectionName}
              onChange={(e) => handleSectionNameChange(index, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
            />

            {/* File upload */}
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => handleFileChange(index, e.target.files)}
              className="block w-full text-sm border border-gray-300 rounded-lg px-3 py-2 
                        file:mr-3 file:rounded-md file:border-none 
                        file:bg-gray-600 file:text-white file:px-3 file:py-1.5 file:text-sm 
                        hover:file:bg-gray-700"
            />

            {/* File list */}
            {section.files.length > 0 && (
              <ul className="space-y-1">
                {section.files.map((file, fIdx) => (
                  <li key={fIdx} className="flex items-center justify-between text-sm border rounded p-2">
                    {/* ✅ PERBAIKAN DI SINI: Tampilkan file.name ATAU file.file_name */}
                    <span className="truncate max-w-[80%]">
                      {file.name || file.file_name || "File"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index, fIdx)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Tombol hapus section */}
            {sections.length > 1 && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleRemoveSection(index)}
                >
                  X
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* Tombol tambah section */}
        <div className="flex justify-start">
          <Button type="button" onClick={handleAddSection}>
            + Tambah Section
          </Button>
        </div>
      </div>
    </div>
  );
}

// "use client";

// import { Button } from "@/components/ui/button";
// import { MomForm } from "./page";

// interface Section {
//   sectionName: string;
//   files: File[];
// }

// interface AttachmentDocumentProps {
//   sections: Section[];
//   handleChange: <K extends keyof MomForm>(field: K, value: MomForm[K]) => void;
// }

// export default function AttachmentDocument({ sections, handleChange }: AttachmentDocumentProps) {

//   // Tambah section baru
//   const handleAddSection = () => {
//     handleChange("attachments", [...sections, { sectionName: "", files: [] }]);
//   }

//   // Hapus section
//   const handleRemoveSection = (index: number) => {
//     handleChange("attachments", sections.filter((_, i) => i !== index));
//   }

//   // Ubah nama section
//   const handleSectionNameChange = (index: number, value: string) => {
//     const updated = [...sections];
//     updated[index].sectionName = value;
//     handleChange("attachments", updated);
//   }

//   // Tambah file ke section
//   const handleFileChange = (index: number, newFiles: FileList | null) => {
//     if (!newFiles) return;
//     const updated = [...sections];
//     updated[index].files = [...updated[index].files, ...Array.from(newFiles)];
//     handleChange("attachments", updated);
//   }

//   // Hapus file tertentu
//   const handleRemoveFile = (sectionIndex: number, fileIndex: number) => {
//     const updated = [...sections];
//     updated[sectionIndex].files.splice(fileIndex, 1);
//     handleChange("attachments", updated);
//   }

//   return (
//     <div className="w-full bg-white rounded-2xl shadow p-6 mb-6">
//       <h2 className="text-lg font-bold text-gray-900 mb-6">Attachments</h2>
//       <div className="space-y-6">
//         {sections.map((section, index) => (
//           <div key={index} className="border rounded-xl p-4 shadow-sm space-y-3">
//             {/* Section name */}
//             <input
//               type="text"
//               placeholder="Section Name"
//               value={section.sectionName}
//               onChange={(e) => handleSectionNameChange(index, e.target.value)}
//               className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
//             />

//             {/* File upload */}
//             <input
//               type="file"
//               multiple
//               accept="image/*,application/pdf"
//               onChange={(e) => handleFileChange(index, e.target.files)}
//               className="block w-full text-sm border border-gray-300 rounded-lg px-3 py-2 
//                         file:mr-3 file:rounded-md file:border-none 
//                         file:bg-gray-600 file:text-white file:px-3 file:py-1.5 file:text-sm 
//                         hover:file:bg-gray-700"
//             />

//             {/* File list */}
//             {section.files.length > 0 && (
//               <ul className="space-y-1">
//                 {section.files.map((file, fIdx) => (
//                   <li key={fIdx} className="flex items-center justify-between text-sm border rounded p-2">
//                     <span className="truncate max-w-[80%]">{file.name}</span>
//                     <button
//                       type="button"
//                       onClick={() => handleRemoveFile(index, fIdx)}
//                       className="text-red-600 hover:text-red-800"
//                     >
//                       ✕
//                     </button>
//                   </li>
//                 ))}
//               </ul>
//             )}

//             {/* Tombol hapus section */}
//             {sections.length > 1 && (
//               <div className="flex justify-end">
//                 <Button
//                   type="button"
//                   variant="destructive"
//                   onClick={() => handleRemoveSection(index)}
//                 >
//                   X
//                 </Button>
//               </div>
//             )}
//           </div>
//         ))}

//         {/* Tombol tambah section */}
//         <div className="flex justify-start">
//           <Button type="button" onClick={handleAddSection}>
//             + Tambah Section
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// }

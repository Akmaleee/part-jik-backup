import { Button } from "@/components/ui/button";
import { InputString } from "@/components/input";
import InputSelect from "@/components/input/input-select";
import { Trash2 } from "lucide-react";

interface Approver {
  name: string;
  email: string;
  type: string;
}

interface ApproverDocumentProps {
  form: { approvers: Approver[] };
  handleChange: (field: string, value: any) => void;
}

const approverTypeOptions = [
  { value: "Internal", label: "Internal" },
  { value: "Eksternal", label: "Eksternal" },
];

export function ApproverDocument({ form, handleChange }: ApproverDocumentProps) {
  
  function handleApproverChange(index: number, field: keyof Approver, value: string) {
    const newApprovers = [...form.approvers];
    newApprovers[index] = {
      ...newApprovers[index],
      [field]: value
    };
    handleChange("approvers", newApprovers);
  }

  function addApprover() {
    handleChange("approvers", [
      ...form.approvers,
      { name: "", email: "", type: "Internal" },
    ]);
  }

  function removeApprover(index: number) {
    const newApprovers = form.approvers.filter((_, i) => i !== index);
    handleChange("approvers", newApprovers);
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-4">Approver</h2>
      <div className="flex flex-col gap-4">
        {form.approvers.map((approver, index) => (
          <div
            key={index}
            className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr_auto] gap-4 items-end"
          >
            <InputString
              title="Nama Penyetuju"
              placeholder="Masukkan nama"
              value={approver.name}
              onChange={(e) => handleApproverChange(index, "name", e.target.value)}
            />
            <InputString
              title="Email"
              placeholder="Masukkan email"
              type="email"
              value={approver.email}
              onChange={(e) => handleApproverChange(index, "email", e.target.value)}
            />
            <InputSelect
              title="Tipe"
              value={approver.type}
              options={approverTypeOptions}
              onChange={(value) => handleApproverChange(index, "type", value as string)}
            />
            <Button
              type="button"
              variant="destructive"
              onClick={() => removeApprover(index)}
              className="h-10 w-10 p-2"
              disabled={form.approvers.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" onClick={addApprover} className="mt-4">
        + Tambah Penyetuju
      </Button>
    </div>
  );
}

// "use client";

// import { InputString } from "@/components/input";
// import { MomForm } from "./page";

// interface ApproverDocumentProps {
//   form: MomForm;
//   handleChange: <K extends keyof MomForm>(field: K, value: MomForm[K]) => void;
// }

// export function ApproverDocument({ form, handleChange }: ApproverDocumentProps) {
//   return (
//     <div className="w-full bg-white rounded-2xl shadow p-6 mb-6">
//       <h2 className="text-lg font-bold text-gray-900 mb-6">Approvers</h2>

//       <div className="space-y-4">
//         {form.approvers?.map((approver, index) => (
//           <div key={index} className="flex items-center gap-3">
//             <div className="flex-1">
//               <InputString
//                 title={index === 0 ? "Penyetuju" : ""}
//                 id={`approver-${index}`}
//                 value={approver.name}
//                 onChange={(e) => {
//                   const newApprovers = [...form.approvers];
//                   newApprovers[index].name = e.target.value;
//                   handleChange("approvers", newApprovers);
//                 }}
//               />
//             </div>

//             {/* Tombol hapus */}
//             {form.approvers.length > 1 && (
//               <button
//                 type="button"
//                 onClick={() => {
//                   const updated = form.approvers.filter((_, i) => i !== index);
//                   handleChange("approvers", updated);
//                 }}
//                 className="p-2 rounded-lg border border-gray-300 text-red-600 hover:bg-red-50"
//               >
//                 ✕
//               </button>
//             )}
//           </div>
//         ))}

//         {/* Tombol tambah */}
//         <div className="flex justify-end">
//           <button
//             type="button"
//             onClick={() => {
//               handleChange("approvers", [...form.approvers, { name: "" }]);
//             }}
//             className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm"
//           >
//             <span className="text-lg">＋</span> Tambah Approver
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

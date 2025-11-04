"use client";

interface NextAction {
  action: string;
  target: string;
  pic: string;
}

interface NextActionDocumentProps {
  form: {
    nextActions: NextAction[];
    [key: string]: any;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  handleChange: (field: string, value: any) => void;
}

export default function NextActionDocument({
  form,
  handleChange,
}: NextActionDocumentProps) {
  const nextActions = form.nextActions || [];

  const updateRow = (index: number, field: keyof NextAction, value: string) => {
    const updated = [...nextActions];
    updated[index][field] = value;
    handleChange("nextActions", updated);
  };

  const removeRow = (index: number) => {
    const updated = nextActions.filter((_, i) => i !== index);
    handleChange("nextActions", updated);
  };

  const addRow = () => {
    handleChange("nextActions", [...nextActions, { action: "", target: "", pic: "" }]);
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-900 mb-6">Next Action</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 rounded-lg">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-3 py-2 border">Action</th>
              <th className="px-3 py-2 border">Target</th>
              <th className="px-3 py-2 border">PIC</th>
              <th className="px-3 py-2 border w-16 text-center">✕</th>
            </tr>
          </thead>
          <tbody>
            {nextActions.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-3 py-2 border">
                  <input
                    type="text"
                    value={row.action}
                    onChange={(e) => updateRow(index, "action", e.target.value)}
                    placeholder="Tuliskan action..."
                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                  />
                </td>
                <td className="px-3 py-2 border">
                  <input
                    type="text"
                    value={row.target}
                    onChange={(e) => updateRow(index, "target", e.target.value)}
                    placeholder="Tuliskan target..."
                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                  />
                </td>
                <td className="px-3 py-2 border">
                  <input
                    type="text"
                    value={row.pic}
                    onChange={(e) => updateRow(index, "pic", e.target.value)}
                    placeholder="Nama PIC..."
                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                  />
                </td>
                <td className="px-3 py-2 border text-center">
                  {nextActions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tombol Tambah Baris */}
      <div className="flex justify-end mt-4">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm"
        >
          <span className="text-lg">＋</span> Tambah Row
        </button>
      </div>
    </div>
  );
}
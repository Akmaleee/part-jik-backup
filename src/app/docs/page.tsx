"use client";

import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { useMemo, useState } from "react";

// =====================
// GraphQL Operations
// =====================
const LIST_DOCS = gql`
  query Documents($includeDeleted: Boolean) {
    documents(includeDeleted: $includeDeleted) {
      id
      companyName
      jikTitle
      unitName
      initiativePartnership
      investValue
      contractDurationYears
      createdAt
      updatedAt
      deletedAt
    }
  }
`;

const CREATE_DOC = gql`
  mutation CreateDocument($input: CreateDocumentInput!) {
    createDocument(input: $input) {
      id
      companyName
      contractDurationYears
    }
  }
`;

const UPDATE_DOC = gql`
  mutation UpdateDocument($input: UpdateDocumentInput!) {
    updateDocument(input: $input) {
      id
      companyName
      jikTitle
      unitName
      initiativePartnership
      investValue
      contractDurationYears
      updatedAt
    }
  }
`;

const SOFT_DELETE_DOC = gql`
  mutation SoftDelete($id: ID!) {
    softDeleteDocument(id: $id)
  }
`;

const RESTORE_DOC = gql`
  mutation Restore($id: ID!) {
    restoreDocument(id: $id)
  }
`;

const HARD_DELETE_DOC = gql`
  mutation HardDelete($id: ID!) {
    hardDeleteDocument(id: $id)
  }
`;

// =====================
// Types (optional helper)
// =====================
type Doc = {
  id: string;
  companyName: string;
  jikTitle: string;
  unitName: string;
  initiativePartnership: string;
  investValue: string | null;
  contractDurationYears: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export default function DocsPage() {
  // Filter show deleted
  const [showDeleted, setShowDeleted] = useState(false);

  // Form create
  const [companyName, setCompanyName] = useState("PT Telkomsat");
  const [jikTitle, setJikTitle] = useState("JIK Mangoes");
  const [unitName, setUnitName] = useState("BizDev");
  const [initiativePartnership, setInitiativePartnership] = useState("Cross-selling & Co-dev");
  const [investValue, setInvestValue] = useState("250000000.00"); // kirim string utk Decimal
  const [contractDurationYears, setContractDurationYears] = useState<number | "">("");

  // Queries & Mutations
  const { data, loading, error, refetch } = useQuery(LIST_DOCS, {
    variables: { includeDeleted: showDeleted },
    fetchPolicy: "cache-and-network",
  });

  const [createDocument, createState] = useMutation(CREATE_DOC);
  const [updateDocument, updateState] = useMutation(UPDATE_DOC);
  const [softDeleteDocument] = useMutation(SOFT_DELETE_DOC);
  const [restoreDocument] = useMutation(RESTORE_DOC);
  const [hardDeleteDocument] = useMutation(HARD_DELETE_DOC);

  const docs: Doc[] = useMemo(() => data?.documents ?? [], [data]);

  // Helpers
  const busy = loading || createState.loading || updateState.loading;

  async function handleCreate() {
    if (!companyName.trim() || !jikTitle.trim() || !unitName.trim() || !initiativePartnership.trim()) {
      alert("Isi semua field utama (Company, JIK Title, Unit, Initiative).");
      return;
    }
    // contractDurationYears optional. investValue juga optional (string, contoh "123.45")
    await createDocument({
      variables: {
        input: {
          companyName,
          jikTitle,
          unitName,
          initiativePartnership,
          investValue: investValue?.trim() ? investValue.trim() : undefined,
          contractDurationYears:
            contractDurationYears === "" ? undefined : Number(contractDurationYears),
        },
      },
    });
    // reset/form sederhana
    setCompanyName("");
    setJikTitle("");
    setUnitName("");
    setInitiativePartnership("");
    setInvestValue("");
    setContractDurationYears("");

    await refetch();
  }

  async function handleSoftDelete(id: string) {
    await softDeleteDocument({ variables: { id } });
    await refetch();
  }

  async function handleRestore(id: string) {
    await restoreDocument({ variables: { id } });
    await refetch();
  }

  async function handleHardDelete(id: string) {
    if (!confirm("Hard delete akan menghapus data permanen. Lanjut?")) return;
    await hardDeleteDocument({ variables: { id } });
    await refetch();
  }

  // Inline edit: kita contohkan update contractDurationYears & investValue
  async function handleInlineUpdate(
    d: Doc,
    patch: Partial<Pick<Doc, "contractDurationYears" | "investValue" | "companyName" | "jikTitle" | "unitName" | "initiativePartnership">>
  ) {
    await updateDocument({
      variables: {
        input: {
          id: d.id,
          ...("companyName" in patch ? { companyName: patch.companyName } : {}),
          ...("jikTitle" in patch ? { jikTitle: patch.jikTitle } : {}),
          ...("unitName" in patch ? { unitName: patch.unitName } : {}),
          ...("initiativePartnership" in patch ? { initiativePartnership: patch.initiativePartnership } : {}),
          ...("investValue" in patch ? { investValue: patch.investValue ?? null } : {}),
          ...("contractDurationYears" in patch
            ? {
                contractDurationYears:
                  patch.contractDurationYears === null ? null : Number(patch.contractDurationYears),
              }
            : {}),
        },
      },
    });
    await refetch();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => {
              setShowDeleted(e.target.checked);
              // refetch otomatis karena variables berubah, tapi kita paksa untuk cepat
              refetch({ includeDeleted: e.target.checked });
            }}
          />
          Show deleted
        </label>
      </header>

      {/* error block */}
      {error && (
        <pre className="bg-red-50 text-red-700 p-3 rounded border border-red-200 overflow-auto">
          {error.message}
        </pre>
      )}

      {/* Create form */}
      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="text-lg font-semibold">Create Document</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm">Company Name</label>
            <input
              className="border rounded px-2 py-1"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="PT Telkomsat"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">JIK Title</label>
            <input
              className="border rounded px-2 py-1"
              value={jikTitle}
              onChange={(e) => setJikTitle(e.target.value)}
              placeholder="JIK Mangoes"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Unit Name</label>
            <input
              className="border rounded px-2 py-1"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="BizDev"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm">Initiative Partnership</label>
            <input
              className="border rounded px-2 py-1"
              value={initiativePartnership}
              onChange={(e) => setInitiativePartnership(e.target.value)}
              placeholder="Cross-selling & Co-dev"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Invest Value (Decimal string)</label>
            <input
              className="border rounded px-2 py-1"
              value={investValue}
              onChange={(e) => setInvestValue(e.target.value)}
              placeholder="250000000.00"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Contract Duration (years)</label>
            <input
              className="border rounded px-2 py-1"
              type="number"
              value={contractDurationYears}
              onChange={(e) => {
                const v = e.target.value;
                setContractDurationYears(v === "" ? "" : Number(v));
              }}
              placeholder="3"
              min={0}
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            disabled={busy}
            onClick={handleCreate}
            className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
          >
            {createState.loading ? "Creating..." : "Create"}
          </button>
        </div>
      </section>

      {/* List */}
      <section className="bg-white rounded-xl shadow divide-y">
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">List</h2>
          {loading && <span className="text-sm text-gray-500">Loading…</span>}
        </div>

        {docs.length === 0 ? (
          <div className="p-4 text-gray-500">No documents.</div>
        ) : (
          docs.map((d) => (
            <div key={d.id} className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm">
                <div className="font-medium">{d.companyName}</div>
                <div className="text-gray-600">
                  {d.jikTitle} • {d.unitName}
                </div>
                <div className="text-gray-600">
                  {d.initiativePartnership}
                </div>
                <div className="text-gray-500">
                  Invest: {d.investValue ?? "—"} • Duration: {d.contractDurationYears ?? "—"}y
                </div>
                {d.deletedAt && <div className="text-red-600">Deleted at: {new Date(d.deletedAt).toLocaleString()}</div>}
              </div>

              <div className="flex flex-wrap gap-2">
                {!d.deletedAt ? (
                  <button
                    className="px-3 py-1 rounded border border-red-600 text-red-600"
                    onClick={() => handleSoftDelete(d.id)}
                  >
                    Soft Delete
                  </button>
                ) : (
                  <button
                    className="px-3 py-1 rounded border border-green-600 text-green-600"
                    onClick={() => handleRestore(d.id)}
                  >
                    Restore
                  </button>
                )}

                <button
                  className="px-3 py-1 rounded border"
                  onClick={() => {
                    const newYears = prompt("Update duration (years):", String(d.contractDurationYears ?? ""));
                    if (newYears === null) return;
                    const ny = newYears.trim() === "" ? null : Number(newYears);
                    void handleInlineUpdate(d, { contractDurationYears: ny as any });
                  }}
                >
                  Update Years
                </button>

                <button
                  className="px-3 py-1 rounded border"
                  onClick={() => {
                    const newVal = prompt("Update invest value (decimal string):", d.investValue ?? "");
                    if (newVal === null) return;
                    const v = newVal.trim() === "" ? null : newVal.trim();
                    void handleInlineUpdate(d, { investValue: v as any });
                  }}
                >
                  Update Invest
                </button>

                <button
                  className="px-3 py-1 rounded border border-black"
                  onClick={() => handleHardDelete(d.id)}
                >
                  Hard Delete
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

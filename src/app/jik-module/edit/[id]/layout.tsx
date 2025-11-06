import React from "react";

export default function JikEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Edit JIK Document
      </h1>
      <div className="max-w-5xl mx-auto">{children}</div>
    </div>
  );
}
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create JIK"
};


export default function CreateJIKLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <>{children}</>
  );
}
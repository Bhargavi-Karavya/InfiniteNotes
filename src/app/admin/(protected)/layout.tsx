import type { ReactNode } from "react";
import { AdminNav } from "@/components/layout/admin-nav";
import { requireAdmin } from "@/services/auth";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-full flex-1 flex-col sm:flex-row">
      <AdminNav adminName={admin.name} adminEmail={admin.email} />
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

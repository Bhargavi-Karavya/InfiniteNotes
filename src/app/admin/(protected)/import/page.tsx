import type { Metadata } from "next";
import { ImportWorkbench } from "@/components/admin/import-workbench";
import {
  getImportProvidersForAdmin,
  listImportHistoryForAdmin,
} from "@/services/import/import.service";

export const metadata: Metadata = {
  title: "Import",
};

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  const [providers, history] = await Promise.all([
    getImportProvidersForAdmin(),
    listImportHistoryForAdmin(25),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Data importer</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          By default only songs with rights/permission (
          <code className="text-xs">AUTHORIZED</code> /{" "}
          <code className="text-xs">PUBLIC_DOMAIN</code>) can be imported. Use a
          licensed catalog JSON feed for lyrics, or MusicBrainz only if you
          explicitly allow metadata without rights.
        </p>
      </header>
      <ImportWorkbench providers={providers} history={history} />
    </div>
  );
}

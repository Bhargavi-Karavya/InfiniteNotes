import type { Metadata } from "next";
import { CorrectionList } from "@/components/admin/correction-list";
import { UnauthorizedError } from "@/services/auth";
import { listCorrectionsAdmin } from "@/services/lyric-corrections";
import { correctionListQuerySchema } from "@/validations/lyric-corrections";

export const metadata: Metadata = {
  title: "Corrections",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
};

export default async function AdminCorrectionsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const parsed = correctionListQuerySchema.safeParse({
    q: params.q,
    status: params.status ?? "PENDING",
    page: params.page,
  });

  if (!parsed.success) {
    return (
      <CorrectionList
        items={[]}
        query=""
        status="PENDING"
        page={1}
        totalPages={1}
        total={0}
        error="Invalid search parameters."
      />
    );
  }

  let error: string | null = null;
  let result = {
    items: [] as Awaited<ReturnType<typeof listCorrectionsAdmin>>["items"],
    page: parsed.data.page,
    totalPages: 1,
    total: 0,
  };

  try {
    result = await listCorrectionsAdmin(parsed.data);
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    error = "Unable to load correction requests.";
  }

  return (
    <CorrectionList
      items={result.items}
      query={parsed.data.q}
      status={parsed.data.status}
      page={result.page}
      totalPages={result.totalPages}
      total={result.total}
      error={error}
    />
  );
}

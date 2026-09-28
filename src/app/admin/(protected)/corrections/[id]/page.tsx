import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CorrectionReview } from "@/components/admin/correction-review";
import {
  CorrectionNotFoundError,
  getCorrectionAdmin,
} from "@/services/lyric-corrections";
import { UnauthorizedError } from "@/services/auth";

export const metadata: Metadata = {
  title: "Review correction",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reviewed?: string }>;
};

export default async function AdminCorrectionDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { reviewed } = await searchParams;

  let correction;
  try {
    correction = await getCorrectionAdmin(id);
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error instanceof CorrectionNotFoundError) notFound();
    throw error;
  }

  const flash =
    reviewed === "approved" || reviewed === "rejected" ? reviewed : null;

  return <CorrectionReview correction={correction} flash={flash} />;
}

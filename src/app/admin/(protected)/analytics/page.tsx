import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { getAnalyticsDashboard } from "@/services/analytics";
import {
  analyticsRangeSchema,
  type AnalyticsRange,
} from "@/validations/analytics";

export const metadata: Metadata = {
  title: "Analytics",
};

export const dynamic = "force-dynamic";

type AnalyticsPageProps = {
  searchParams: Promise<{ range?: string }>;
};

export default async function AdminAnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const params = await searchParams;
  const parsed = analyticsRangeSchema.safeParse(params.range ?? "30d");
  const range: AnalyticsRange = parsed.success ? parsed.data : "30d";

  const data = await getAnalyticsDashboard(range);

  return <AnalyticsDashboard range={range} data={data} />;
}

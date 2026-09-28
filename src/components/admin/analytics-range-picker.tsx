import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AnalyticsRange } from "@/validations/analytics";

const RANGES: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

export function AnalyticsRangePicker({
  current,
}: {
  current: AnalyticsRange;
}) {
  return (
    <div
      className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1"
      role="group"
      aria-label="Analytics date range"
    >
      {RANGES.map((range) => {
        const active = range.value === current;
        return (
          <Link
            key={range.value}
            href={`/admin/analytics?range=${range.value}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium sm:text-sm",
              active
                ? "bg-brand-500 text-white shadow-sm"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            {range.label}
          </Link>
        );
      })}
    </div>
  );
}

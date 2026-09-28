import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PublicSearchFormProps = {
  defaultQuery?: string;
  autoFocus?: boolean;
  size?: "hero" | "compact";
  id?: string;
};

export function PublicSearchForm({
  defaultQuery = "",
  autoFocus = false,
  size = "hero",
  id = "public-search",
}: PublicSearchFormProps) {
  const isHero = size === "hero";

  return (
    <form
      action="/search"
      method="get"
      className={cn(
        "flex w-full",
        isHero ? "flex-col gap-2 sm:flex-row" : "items-center gap-2",
      )}
      role="search"
    >
      <label htmlFor={id} className="sr-only">
        Search songs or artists
      </label>
      <Input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultQuery}
        placeholder="Search songs or artists"
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
        className={cn(
          isHero
            ? "h-12 flex-1 rounded-xl border-border bg-surface text-base shadow-[var(--shadow-soft)]"
            : "h-10 flex-1 rounded-lg text-sm",
        )}
      />
      <button
        type="submit"
        className={cn(
          "inline-flex items-center justify-center font-medium text-white transition-colors",
          "bg-brand-500 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
          isHero
            ? "h-12 rounded-xl px-5 text-sm"
            : "h-10 rounded-lg px-3 text-sm",
        )}
      >
        Search
      </button>
    </form>
  );
}

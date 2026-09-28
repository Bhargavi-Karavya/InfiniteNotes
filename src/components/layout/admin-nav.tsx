import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/admin/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

const adminNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/corrections", label: "Corrections" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/songs", label: "Songs" },
  { href: "/admin/artists", label: "Artists" },
];

type AdminNavProps = {
  adminName: string;
  adminEmail: string;
};

export function AdminNav({ adminName, adminEmail }: AdminNavProps) {
  return (
    <aside className="border-b border-border bg-card sm:w-60 sm:shrink-0 sm:border-b-0 sm:border-r">
      <div className="flex items-center justify-between gap-2 px-4 py-4 sm:px-5">
        <BrandLogo href="/admin" />
        <ThemeToggle className="sm:hidden" />
      </div>
      <div className="px-4 pb-3 sm:px-5">
        <p className="truncate text-xs font-medium">{adminName}</p>
        <p className="truncate text-xs text-muted-foreground">{adminEmail}</p>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto px-3 pb-3 sm:flex-col sm:px-3"
        aria-label="Admin"
      >
        {adminNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted-foreground transition-ui hover:bg-surface-muted hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="hidden border-t border-border px-3 py-3 sm:block">
        <div className="mb-2">
          <ThemeToggle />
        </div>
        <LogoutButton />
      </div>
      <div className="border-t border-border px-3 py-3 sm:hidden">
        <LogoutButton />
      </div>
    </aside>
  );
}

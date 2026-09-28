import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Overview",
};

const links = [
  {
    href: "/admin/analytics",
    title: "Analytics",
    description: "Views, searches, and top content",
  },
  {
    href: "/admin/corrections",
    title: "Corrections",
    description: "Review lyric correction requests",
  },
  {
    href: "/admin/songs",
    title: "Songs",
    description: "Create and publish lyrics",
  },
  {
    href: "/admin/artists",
    title: "Artists",
    description: "Manage artist profiles",
  },
];

export default function AdminHomePage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage InfiniteNotes content and usage
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className="transition-ui">
            <Card className="h-full hover:shadow-[var(--shadow-glow)]">
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

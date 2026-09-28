import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand/logo";
import { AdminLoginForm } from "@/components/admin/login-form";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUserVerified } from "@/services/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login",
  robots: {
    index: false,
    follow: false,
  },
};

type AdminLoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const currentUser = await getCurrentUserVerified();

  if (currentUser?.role === "ADMIN") {
    redirect("/admin");
  }

  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/admin")
      ? params.next
      : "/admin";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <BrandLogo href="/" />
        <ThemeToggle />
      </div>
      <Card>
        <CardTitle>Admin login</CardTitle>
        <CardDescription>
          Sign in with your InfiniteNotes admin account.
        </CardDescription>
        <div className="mt-6">
          <AdminLoginForm nextPath={nextPath} />
        </div>
      </Card>
    </div>
  );
}

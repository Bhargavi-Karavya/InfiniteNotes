import type { ReactNode } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type PlaceholderPageProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PlaceholderPage({
  title,
  description,
  children,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Card>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {children ? <div className="mt-4">{children}</div> : null}
      </Card>
    </div>
  );
}

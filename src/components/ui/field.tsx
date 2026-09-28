import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
  hint?: string;
};

export function Field({ label, htmlFor, error, children, hint }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-foreground"
        {...({} as LabelHTMLAttributes<HTMLLabelElement>)}
      >
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormMessage({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "success";
}) {
  return (
    <p
      className={cn(
        "text-sm",
        tone === "error" ? "text-red-600" : "text-brand-600",
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

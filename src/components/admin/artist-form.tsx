"use client";

import { useRef, useState, useActionState } from "react";
import Link from "next/link";
import {
  createArtistAction,
  updateArtistAction,
  type ActionResult,
} from "@/app/admin/(protected)/artists/actions";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";
import type { PublicArtist } from "@/services/artists";

type ArtistFormProps = {
  mode: "create" | "edit";
  artist?: PublicArtist;
  created?: boolean;
};

const initialState: ActionResult | null = null;

export function ArtistForm({ mode, artist, created }: ArtistFormProps) {
  const [name, setName] = useState(artist?.name ?? "");
  const [manualSlug, setManualSlug] = useState(
    mode === "edit" ? (artist?.slug ?? "") : "",
  );
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const slugInputRef = useRef<HTMLInputElement>(null);

  const slug = slugTouched ? manualSlug : slugify(name);

  const boundUpdate = updateArtistAction.bind(null, artist?.id ?? "");
  const action = mode === "create" ? createArtistAction : boundUpdate;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-xl flex-col gap-4">
      {created ? (
        <FormMessage tone="success">Artist created successfully.</FormMessage>
      ) : null}
      {state?.ok === false ? <FormMessage>{state.error}</FormMessage> : null}
      {state?.ok === true && mode === "edit" ? (
        <FormMessage tone="success">Artist updated successfully.</FormMessage>
      ) : null}

      <Field
        label="Name"
        htmlFor="name"
        error={state?.ok === false ? state.fieldErrors?.name?.[0] : undefined}
      >
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isPending}
          required
          maxLength={255}
        />
      </Field>

      <Field
        label="Slug"
        htmlFor="slug"
        hint="URL-safe identifier. Auto-generated from the name until you edit it."
        error={state?.ok === false ? state.fieldErrors?.slug?.[0] : undefined}
      >
        <Input
          ref={slugInputRef}
          id="slug"
          name="slug"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setManualSlug(event.target.value);
          }}
          disabled={isPending}
          required
          maxLength={255}
        />
      </Field>

      <Field
        label="Profile image URL"
        htmlFor="profileImage"
        hint="Optional"
        error={
          state?.ok === false ? state.fieldErrors?.profileImage?.[0] : undefined
        }
      >
        <Input
          id="profileImage"
          name="profileImage"
          type="url"
          defaultValue={artist?.profileImage ?? ""}
          disabled={isPending}
          placeholder="https://…"
        />
      </Field>

      <Field
        label="Biography"
        htmlFor="biography"
        hint="Optional"
        error={
          state?.ok === false ? state.fieldErrors?.biography?.[0] : undefined
        }
      >
        <Textarea
          id="biography"
          name="biography"
          defaultValue={artist?.biography ?? ""}
          disabled={isPending}
          maxLength={10000}
        />
      </Field>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create artist"
              : "Save changes"}
        </Button>
        <Link
          href="/admin/artists"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-surface-muted px-4 text-sm font-medium text-foreground hover:bg-surface-elevated"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

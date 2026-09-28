"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createSongAction,
  updateSongAction,
  type SongActionResult,
} from "@/app/admin/(protected)/songs/actions";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";
import type { ArtistOption, PublicSong } from "@/services/songs";

type SongFormProps = {
  mode: "create" | "edit";
  song?: PublicSong;
  artists: ArtistOption[];
  created?: boolean;
};

const initialState: SongActionResult | null = null;

export function SongForm({ mode, song, artists, created }: SongFormProps) {
  const [title, setTitle] = useState(song?.title ?? "");
  const [manualSlug, setManualSlug] = useState(
    mode === "edit" ? (song?.slug ?? "") : "",
  );
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [lyrics, setLyrics] = useState(song?.lyrics ?? "");
  const [isPublished, setIsPublished] = useState(song?.isPublished ?? false);

  const slug = slugTouched ? manualSlug : slugify(title);
  const boundUpdate = updateSongAction.bind(null, song?.id ?? "");
  const action = mode === "create" ? createSongAction : boundUpdate;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {created ? (
        <FormMessage tone="success">Song created successfully.</FormMessage>
      ) : null}
      {state?.ok === false ? <FormMessage>{state.error}</FormMessage> : null}
      {state?.ok === true && mode === "edit" ? (
        <FormMessage tone="success">Song updated successfully.</FormMessage>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Title"
          htmlFor="title"
          error={state?.ok === false ? state.fieldErrors?.title?.[0] : undefined}
        >
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isPending}
            required
            maxLength={255}
          />
        </Field>

        <Field
          label="Artist"
          htmlFor="artistId"
          error={
            state?.ok === false ? state.fieldErrors?.artistId?.[0] : undefined
          }
        >
          <select
            id="artistId"
            name="artistId"
            defaultValue={song?.artistId ?? ""}
            disabled={isPending || artists.length === 0}
            required
            className="flex h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <option value="" disabled>
              {artists.length === 0 ? "Create an artist first" : "Select artist"}
            </option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Slug"
        htmlFor="slug"
        hint="URL-safe identifier. Auto-generated from the title until you edit it."
        error={state?.ok === false ? state.fieldErrors?.slug?.[0] : undefined}
      >
        <Input
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
        label="Cover image URL"
        htmlFor="coverImage"
        hint="Optional"
        error={
          state?.ok === false ? state.fieldErrors?.coverImage?.[0] : undefined
        }
      >
        <Input
          id="coverImage"
          name="coverImage"
          type="url"
          defaultValue={song?.coverImage ?? ""}
          disabled={isPending}
          placeholder="https://…"
        />
      </Field>

      <Field
        label="Status"
        htmlFor="isPublished"
        hint="Published songs are eligible for the public catalog."
      >
        <select
          id="isPublished"
          name="isPublished"
          value={isPublished ? "true" : "false"}
          onChange={(event) => setIsPublished(event.target.value === "true")}
          disabled={isPending}
          className="flex h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 md:max-w-xs"
        >
          <option value="false">Unpublished (draft)</option>
          <option value="true">Published</option>
        </select>
      </Field>

      <Field
        label="Lyrics"
        htmlFor="lyrics"
        hint="Plain text. Line breaks and empty lines are preserved."
        error={state?.ok === false ? state.fieldErrors?.lyrics?.[0] : undefined}
      >
        <Textarea
          id="lyrics"
          name="lyrics"
          value={lyrics}
          onChange={(event) => setLyrics(event.target.value)}
          disabled={isPending}
          spellCheck
          className="min-h-[50vh] resize-y font-mono text-sm leading-relaxed sm:min-h-[28rem]"
          placeholder={"Verse 1\n\nLine one\nLine two\n\nChorus\n\nLine three"}
        />
        <p className="text-xs text-muted-foreground">
          {lyrics.length.toLocaleString()} characters
          {isPublished ? " · required for published songs" : ""}
        </p>
      </Field>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending || artists.length === 0}>
          {isPending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create song"
              : "Save changes"}
        </Button>
        <Link
          href="/admin/songs"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-surface-muted px-4 text-sm font-medium text-foreground hover:bg-surface-elevated"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteArtistAction } from "@/app/admin/(protected)/artists/actions";
import { Button } from "@/components/ui/button";

type DeleteArtistButtonProps = {
  artistId: string;
  artistName: string;
  songCount: number;
};

export function DeleteArtistButton({
  artistId,
  artistName,
  songCount,
}: DeleteArtistButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    setError(null);

    if (songCount > 0) {
      setError(
        "This artist cannot be deleted because songs are associated with this artist.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete artist “${artistName}”? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteArtistAction(artistId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={onDelete}
        disabled={isPending}
      >
        {isPending ? "Deleting…" : "Delete"}
      </Button>
      {error ? (
        <p className="max-w-48 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

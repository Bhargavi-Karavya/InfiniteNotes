"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSongAction } from "@/app/admin/(protected)/songs/actions";
import { Button } from "@/components/ui/button";

type DeleteSongButtonProps = {
  songId: string;
  songTitle: string;
};

export function DeleteSongButton({ songId, songTitle }: DeleteSongButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    setError(null);
    const confirmed = window.confirm(
      `Delete song “${songTitle}”? This cannot be undone. The artist will not be deleted.`,
    );
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteSongAction(songId);
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

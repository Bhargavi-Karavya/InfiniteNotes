type LyricsBlockProps = {
  lyrics: string | null;
};

/**
 * Renders plain-text lyrics with preserved line breaks and blank lines.
 * No HTML injection — whitespace is handled via CSS.
 */
export function LyricsBlock({ lyrics }: LyricsBlockProps) {
  const content = lyrics?.length ? lyrics : null;

  if (!content) {
    return (
      <p className="text-sm text-muted-foreground">
        Lyrics are not available for this song yet.
      </p>
    );
  }

  return <div className="lyrics-panel text-foreground">{content}</div>;
}

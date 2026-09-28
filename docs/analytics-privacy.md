# InfiniteNotes analytics privacy

First-party analytics store **anonymous usage events only**.

## What we store

- Event type (`PAGE_VIEW`, `SONG_VIEW`, `ARTIST_VIEW`, `SEARCH`)
- Public path
- Entity type / entity id when applicable (song or artist UUID)
- Normalized search query text (trimmed, lowercased)
- Timestamp

## What we do not store

- Email addresses
- Passwords
- Full IP addresses
- Names or account identifiers of visitors
- Cookies tied to personal identity

## Deduplication

Client-side `sessionStorage` prevents duplicate counts from React Strict Mode /
hydration remounts for the same path in the same tab session. No durable
visitor fingerprint is persisted server-side in v1.

## Future

The schema can later support optional anonymous session keys, device class, or
geo region without changing the event table shape — those fields are not
implemented yet.

ALTER TABLE artists
  ADD COLUMN spotify_id text,
  ADD COLUMN followers integer,
  ADD COLUMN popularity integer,
  ADD COLUMN genres text[],
  ADD COLUMN image_url text,
  ADD COLUMN not_on_spotify boolean NOT NULL DEFAULT false;

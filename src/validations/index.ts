export {
  createUserSchema,
  loginSchema,
  userRoleSchema,
  type CreateUserInput,
  type LoginInput,
} from "./auth";
export {
  createArtistSchema,
  updateArtistSchema,
  artistListQuerySchema,
  type CreateArtistInput,
  type UpdateArtistInput,
  type ArtistListQuery,
} from "./artists";
export {
  createSongSchema,
  updateSongSchema,
  songListQuerySchema,
  searchQuerySchema,
  type CreateSongInput,
  type UpdateSongInput,
  type SongListQuery,
  type SearchQueryInput,
} from "./songs";

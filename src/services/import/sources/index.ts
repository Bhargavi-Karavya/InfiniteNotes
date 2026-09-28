import type { MusicDataSource } from "../types";
import { catalogJsonSource } from "./catalog-json";
import { musicBrainzSource } from "./musicbrainz";

const providers: MusicDataSource[] = [musicBrainzSource, catalogJsonSource];

export function listImportProviders(): Array<{
  id: string;
  name: string;
  description: string;
  canImportMetadata: boolean;
  canImportLyrics: boolean;
  allowedHosts: string[];
}> {
  return providers.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    canImportMetadata: p.canImportMetadata,
    canImportLyrics: p.canImportLyrics,
    allowedHosts: p.allowedHosts,
  }));
}

export function getImportProvider(id: string): MusicDataSource | null {
  return providers.find((p) => p.id === id) ?? null;
}

export function requireImportProvider(id: string): MusicDataSource {
  const provider = getImportProvider(id);
  if (!provider) {
    throw new Error("Unsupported import provider.");
  }
  return provider;
}

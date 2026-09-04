export type PlaceSuggestion = {
  placeId: string;
  name: string;
  address: string;
};

export type PlaceViewport = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type PlaceHit = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  viewport?: PlaceViewport;
};

/** 브라우저는 Google Places를 직접 호출하지 않는다. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 1) {
    return [];
  }
  const response = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`, { signal });
  if (!response.ok) {
    throw new Error("places-search-failed");
  }
  const body = (await response.json()) as { suggestions?: PlaceSuggestion[] };
  return Array.isArray(body.suggestions) ? body.suggestions : [];
}

export async function resolvePlace(placeId: string, signal?: AbortSignal): Promise<PlaceHit> {
  const response = await fetch(`/api/places/search?placeId=${encodeURIComponent(placeId)}`, { signal });
  if (!response.ok) {
    throw new Error("places-details-failed");
  }
  const body = (await response.json()) as PlaceHit;
  if (typeof body.lat !== "number" || typeof body.lng !== "number") {
    throw new Error("places-details-failed");
  }
  return body;
}

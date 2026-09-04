import type { Config } from "@netlify/functions";
import { applyLocalEnvFiles } from "./_shared/localEnv";

type Suggestion = {
  placeId: string;
  name: string;
  address: string;
};

type PlaceViewport = {
  south: number;
  west: number;
  north: number;
  east: number;
};

type PlaceHit = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  viewport?: PlaceViewport;
};

type AutocompleteNewResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      text?: { text?: string };
    };
  }>;
  error?: { message?: string; status?: string };
};

type DetailsNewResponse = {
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  viewport?: {
    low?: { latitude?: number; longitude?: number };
    high?: { latitude?: number; longitude?: number };
  };
  error?: { message?: string; status?: string };
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function apiKey(): string | undefined {
  applyLocalEnvFiles();
  const fromProcess = process.env.GOOGLE_PLACES_API_KEY;
  if (fromProcess) {
    return fromProcess;
  }
  try {
    return Netlify.env.get("GOOGLE_PLACES_API_KEY") ?? undefined;
  } catch {
    return undefined;
  }
}

export default async (req: Request) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const key = apiKey();
  if (!key) {
    return json({ suggestions: [], results: [], error: "GOOGLE_PLACES_API_KEY가 없습니다." }, 503);
  }

  const url = new URL(req.url);
  const placeId = url.searchParams.get("placeId")?.trim() ?? "";
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (placeId) {
    return details(placeId, key);
  }
  if (query.length < 1) {
    return json({ suggestions: [] as Suggestion[] });
  }
  return autocomplete(query.slice(0, 80), key);
};

async function autocomplete(query: string, key: string): Promise<Response> {
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
      },
      body: JSON.stringify({ input: query, languageCode: "ko" }),
    });
    const payload = (await response.json()) as AutocompleteNewResponse;
    if (!response.ok || payload.error) {
      return json({ suggestions: [] as Suggestion[], error: payload.error?.message ?? `HTTP ${response.status}` }, 502);
    }
    const suggestions: Suggestion[] = (payload.suggestions ?? [])
      .map((item) => {
        const prediction = item.placePrediction;
        if (!prediction?.placeId) {
          return undefined;
        }
        return {
          placeId: prediction.placeId,
          name: prediction.structuredFormat?.mainText?.text || prediction.text?.text || "",
          address: prediction.structuredFormat?.secondaryText?.text || "",
        };
      })
      .filter((item): item is Suggestion => Boolean(item))
      .slice(0, 8);
    return json({ suggestions });
  } catch {
    return json({ suggestions: [] as Suggestion[], error: "Places 검색에 실패했습니다." }, 502);
  }
}

async function details(placeId: string, key: string): Promise<Response> {
  const id = placeId.replace(/^places\//, "");
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "displayName,formattedAddress,location,viewport",
      },
    });
    const payload = (await response.json()) as DetailsNewResponse;
    if (!response.ok || payload.error) {
      return json({ error: payload.error?.message ?? `HTTP ${response.status}` }, 502);
    }
    const lat = payload.location?.latitude;
    const lng = payload.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return json({ error: "좌표를 찾지 못했습니다." }, 502);
    }
    const south = payload.viewport?.low?.latitude;
    const west = payload.viewport?.low?.longitude;
    const north = payload.viewport?.high?.latitude;
    const east = payload.viewport?.high?.longitude;
    const viewport =
      typeof south === "number" && typeof west === "number" && typeof north === "number" && typeof east === "number"
        ? { south, west, north, east }
        : undefined;
    const hit: PlaceHit = {
      name: payload.displayName?.text ?? "",
      address: payload.formattedAddress ?? "",
      lat,
      lng,
      viewport,
    };
    return json(hit);
  } catch {
    return json({ error: "장소 좌표를 불러오지 못했습니다." }, 502);
  }
}

export const config: Config = {
  path: "/api/places/search",
  method: "GET",
};

export type MapKind = "google" | "image";

export type MapAdapter = {
  kind: MapKind;
  mount: (el: HTMLElement) => Promise<void>;
  destroy: () => void;
};

export type MapCreateOptions = {
  provider?: MapKind;
  googleKey?: string;
  imageUrl?: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  heading?: number;
  mapType?: "roadmap" | "satellite" | "hybrid";
  interactive?: boolean;
};

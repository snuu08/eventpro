export type EventPurpose =
  | "experience"
  | "promotion"
  | "market"
  | "performance"
  | "networking"
  | "custom";

/** locked viewport 기준 0~1 */
export type NormalizedPoint = { x: number; y: number };

export type LockedMapState = {
  provider: "google" | "image";
  center?: { lat: number; lng: number };
  zoom?: number;
  heading?: number;
  mapType: "roadmap" | "satellite" | "hybrid";
  frameAspectRatio: number;
  baseViewport: { width: number; height: number };
  lockedAt: string;
  uploadedImageId?: string;
};

export type AccessPoint = {
  id: string;
  position: NormalizedPoint;
  roles: Array<"entrance" | "exit">;
  flowShare: number;
  label: string;
};

export type ProgramRequirement = {
  key:
    | "power"
    | "internet"
    | "water"
    | "noise"
    | "weather"
    | "queue-space"
    | "safety"
    | "staff"
    | "signage";
  level: "none" | "low" | "medium" | "high";
  reason: string;
  source: "user" | "ai" | "rule";
  accepted: boolean;
};

export type ProgramBooth = {
  id: string;
  name: string;
  description: string;
  category: string;
  dwellMinutes: number;
  capacity: number;
  popularity: 1 | 2 | 3 | 4 | 5;
  requirements: ProgramRequirement[];
  position?: NormalizedPoint;
  size?: { width: number; height: number };
  rotation?: number;
};

export type LayoutRules = {
  pattern: "linear" | "facing-rows" | "u-shape" | "islands" | "custom";
  aisleWidth: number;
  boothGap: number;
  entranceClearance: number;
  exitClearance: number;
  stageClearance?: number;
  keepPopularBoothsApart: boolean;
  keepNoisyZoneAwayFromQuietZone: boolean;
};

export type LayoutCandidate = {
  id: string;
  label: "A" | "B" | "C";
  booths: ProgramBooth[];
  score: {
    congestion: number;
    averageWalkingDistance: number;
    entranceDistribution: number;
    exitAccessibility: number;
    total: number;
  };
  strengths: string[];
  cautions: string[];
};

export type OptionalFacility = {
  id: string;
  type: "stage" | "information" | "medical" | "restroom" | "special";
  position: NormalizedPoint;
};

export type ObstacleType = "building" | "barrier" | "tree" | "water" | "construction" | "fountain";

export type VenueObstacle = {
  id: string;
  source: "osm";
  type: ObstacleType;
  osmId: string;
  geoGeometry: Array<{ lat: number; lng: number }>;
  normalizedGeometry: NormalizedPoint[];
  confirmed: boolean;
};

export type EventProject = {
  id: string;
  title: string;
  passwordSalt: string;
  passwordHash: string;
  expectedVisitors: number;
  boothCount: number;
  purpose: EventPurpose;
  customPurpose?: string;
  map?: LockedMapState;
  venuePolygon: NormalizedPoint[];
  accessPoints: AccessPoint[];
  booths: ProgramBooth[];
  optionalFacilities: OptionalFacility[];
  obstacles?: VenueObstacle[];
  layoutRules?: LayoutRules;
  candidates: LayoutCandidate[];
  selectedCandidateId?: string;
  workspaceZoom?: number;
  schemaVersion: number;
  updatedAt: string;
};

export const EVENT_PROJECT_SCHEMA_VERSION = 1;

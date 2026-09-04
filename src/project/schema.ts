import { z } from "zod";
import { REQUIREMENT_KEYS } from "../ops/schema";

export const normalizedPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const requirementSchema = z.object({
  key: z.enum(REQUIREMENT_KEYS),
  level: z.enum(["none", "low", "medium", "high"]),
  reason: z.string(),
  source: z.enum(["user", "ai", "rule"]),
  accepted: z.boolean(),
});

const boothSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  dwellMinutes: z.number(),
  capacity: z.number(),
  popularity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  requirements: z.array(requirementSchema),
  position: normalizedPointSchema.optional(),
  size: z.object({ width: z.number().min(0).max(1), height: z.number().min(0).max(1) }).optional(),
  rotation: z.number().optional(),
});

export const eventProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  passwordSalt: z.string(),
  passwordHash: z.string(),
  expectedVisitors: z.number().nonnegative(),
  boothCount: z.number().int().nonnegative(),
  purpose: z.enum(["experience", "promotion", "market", "performance", "networking", "custom"]),
  customPurpose: z.string().optional(),
  map: z
    .object({
      provider: z.enum(["google", "image"]),
      center: z.object({ lat: z.number(), lng: z.number() }).optional(),
      zoom: z.number().optional(),
      heading: z.number().min(0).max(360).optional(),
      mapType: z.enum(["roadmap", "satellite", "hybrid"]),
      frameAspectRatio: z.number().positive(),
      baseViewport: z.object({ width: z.number(), height: z.number() }),
      lockedAt: z.string(),
      uploadedImageId: z.string().optional(),
    })
    .optional(),
  venuePolygon: z.array(normalizedPointSchema),
  accessPoints: z.array(
    z.object({
      id: z.string(),
      position: normalizedPointSchema,
      roles: z.array(z.enum(["entrance", "exit"])),
      flowShare: z.number(),
      label: z.string(),
    }),
  ),
  booths: z.array(boothSchema),
  optionalFacilities: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["stage", "information", "medical", "restroom", "special"]),
      position: normalizedPointSchema,
    }),
  ),
  obstacles: z
    .array(
      z.object({
        id: z.string(),
        source: z.literal("osm"),
        type: z.enum(["building", "barrier", "tree", "water", "construction", "fountain"]),
        osmId: z.string(),
        geoGeometry: z.array(z.object({ lat: z.number(), lng: z.number() })),
        normalizedGeometry: z.array(normalizedPointSchema),
        confirmed: z.boolean(),
      }),
    )
    .optional(),
  layoutRules: z
    .object({
      pattern: z.enum(["linear", "facing-rows", "u-shape", "islands", "custom"]),
      aisleWidth: z.number(),
      boothGap: z.number(),
      entranceClearance: z.number(),
      exitClearance: z.number(),
      stageClearance: z.number().optional(),
      keepPopularBoothsApart: z.boolean(),
      keepNoisyZoneAwayFromQuietZone: z.boolean(),
    })
    .optional(),
  candidates: z.array(
    z.object({
      id: z.string(),
      label: z.enum(["A", "B", "C"]),
      booths: z.array(boothSchema),
      score: z.object({
        congestion: z.number(),
        averageWalkingDistance: z.number(),
        entranceDistribution: z.number(),
        exitAccessibility: z.number(),
        total: z.number(),
      }),
      strengths: z.array(z.string()),
      cautions: z.array(z.string()),
    }),
  ),
  selectedCandidateId: z.string().optional(),
  workspaceZoom: z.number().min(0.5).max(2).optional(),
  schemaVersion: z.literal(1),
  updatedAt: z.string(),
});

export type EventProjectRecord = z.infer<typeof eventProjectSchema>;

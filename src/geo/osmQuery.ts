/** Overpass QL 고정본. man_made=* 전부는 넣지 않는다. MCP query_raw로 서울시청 일대에서 검증함. */
export const OSM_OBSTACLE_TIMEOUT_SEC = 20;

export function buildOsmObstacleQuery(bbox: { south: number; west: number; north: number; east: number }): string {
  const range = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `[out:json][timeout:${OSM_OBSTACLE_TIMEOUT_SEC}];
(
  nwr["building"](${range});
  nwr["barrier"](${range});
  nwr["natural"~"tree|tree_row|water"](${range});
  nwr["waterway"](${range});
  nwr["amenity"="fountain"](${range});
  nwr["landuse"="construction"](${range});
);
out geom;`;
}

export const OSM_ATTRIBUTION = "지도 데이터 © OpenStreetMap contributors";

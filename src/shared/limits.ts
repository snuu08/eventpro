/** 학교·청소년·플리마켓·중소 박람회. 시뮬은 최대 800 대표 에이전트에 가중치를 둔다. */
export const VISITORS_MIN = 10;
export const VISITORS_MAX = 20_000;

/** 배치 후보 칸과 화면 가독성. 너무 많으면 겹침·성능이 무너진다. */
export const BOOTHS_MIN = 1;
export const BOOTHS_MAX = 40;

export const PASSWORD_MIN_LENGTH = 4;

export const WORKSPACE_ZOOM_MIN = 0.5;
export const WORKSPACE_ZOOM_MAX = 2;

export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

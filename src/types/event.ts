export const EVENT_TYPES = [
  "축제",
  "체험행사",
  "박람회",
  "정책·홍보행사",
  "플리마켓",
  "공연",
  "기타",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface EventDraft {
  name: string;
  expectedAttendees: number;
  boothCount: number;
  eventType: EventType;
}

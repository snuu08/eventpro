import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { EVENT_TYPES } from "../types/event";
import type { EventType } from "../types/event";
import { useEventSession } from "../state/useEventSession";
import "./CreateEventPage.css";

export function CreateEventPage() {
  const navigate = useNavigate();
  const { session, createEvent } = useEventSession();

  const [name, setName] = useState(session.draft?.name ?? "");
  const [attendees, setAttendees] = useState(
    session.draft?.expectedAttendees?.toString() ?? "",
  );
  const [boothCount, setBoothCount] = useState(
    session.draft?.boothCount?.toString() ?? "",
  );
  const [eventType, setEventType] = useState<EventType>(
    session.draft?.eventType ?? "축제",
  );
  const [error, setError] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const expectedAttendees = Number(attendees);
    const booths = Number(boothCount);

    if (!trimmedName) {
      setError("행사명을 입력하세요.");
      return;
    }
    if (!Number.isInteger(expectedAttendees) || expectedAttendees < 1) {
      setError("예상 참여인원은 1 이상의 정수여야 합니다.");
      return;
    }
    if (!Number.isInteger(booths) || booths < 0) {
      setError("부스 개수는 0 이상의 정수여야 합니다.");
      return;
    }

    createEvent({
      name: trimmedName,
      expectedAttendees,
      boothCount: booths,
      eventType,
    });
    navigate("/map");
  };

  return (
    <div className="create-page">
      <form className="create-card" onSubmit={onSubmit}>
        <p className="create-kicker">EventPro</p>
        <h1>행사 운영하기</h1>
        <p className="create-lead">행사 기본 정보를 입력한 뒤 장소를 지도에서 고릅니다.</p>

        <label className="field">
          <span>행사명</span>
          <input
            type="text"
            name="eventName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 한강 여름 축제"
            autoComplete="off"
            required
          />
        </label>

        <label className="field">
          <span>예상 참여인원</span>
          <input
            type="number"
            name="expectedAttendees"
            min={1}
            step={1}
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="예: 5000"
            required
          />
        </label>

        <label className="field">
          <span>부스 개수</span>
          <input
            type="number"
            name="boothCount"
            min={0}
            step={1}
            value={boothCount}
            onChange={(e) => setBoothCount(e.target.value)}
            placeholder="예: 40"
            required
          />
        </label>

        <fieldset className="field">
          <legend>행사 유형</legend>
          <div className="type-grid">
            {EVENT_TYPES.map((type) => (
              <label key={type} className={eventType === type ? "type-chip is-active" : "type-chip"}>
                <input
                  type="radio"
                  name="eventType"
                  value={type}
                  checked={eventType === type}
                  onChange={() => setEventType(type)}
                />
                {type}
              </label>
            ))}
          </div>
        </fieldset>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="primary-btn">
          행사 만들기
        </button>
      </form>
    </div>
  );
}

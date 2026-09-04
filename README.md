# 행사구성 LAB

장소를 고정하고 부스 배치와 방문객 흐름을 비교하는 웹앱입니다.

이 결과는 배치안 비교를 위한 추정치이며 법정 안전검토를 대체하지 않습니다.

데이터는 이 기기 IndexedDB(`event-lab`)에 저장됩니다. 비밀번호 원문은 저장하지 않습니다.

## 실행

```bash
npm install
npm run dev
```

## 검사

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## 환경 변수

`.env.example`의 이름만 사용합니다. 값은 커밋하지 않습니다.

- `VITE_GOOGLE_MAPS_API_KEY` — Google Maps JS (없으면 도면 이미지 업로드)
- `GOOGLE_PLACES_API_KEY` — 서버 `/api/places/search` 전용. 클라이언트 번들에 넣지 않음
- `ANTHROPIC_API_KEY` — 서버 전용. 클라이언트 번들에 넣지 않음

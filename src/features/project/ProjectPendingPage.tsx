import { Link, useParams } from "react-router-dom";

export function ProjectPendingPage() {
  const { projectId } = useParams();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-xl font-semibold">프로젝트 편집 준비 중</h1>
      <p className="mt-2 text-sm text-gray-600">
        프로젝트 <span className="font-mono">{projectId}</span> 화면은 아직 구현되지 않았습니다. 지도 고정, 영역
        편집, 배치는 이후 단계에서 연결됩니다.
      </p>
      <Link to="/" className="mt-4 inline-block text-sm underline">
        처음으로
      </Link>
    </main>
  );
}

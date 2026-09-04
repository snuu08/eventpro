import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-sm text-gray-600">주소가 잘못되었거나 아직 준비되지 않은 화면입니다.</p>
      <Link to="/" className="mt-4 inline-block text-sm underline">
        처음으로
      </Link>
    </main>
  );
}

import { Link, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            행사구성 LAB
          </Link>
          <span className="text-xs text-gray-500">로컬 행사 구성 · 동선 시뮬레이터</span>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

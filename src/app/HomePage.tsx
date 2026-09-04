import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { hashEditPassword, verifyEditPassword } from "../project/password";
import { listProjects, loadProject, saveProject } from "../project/db";
import { parseImportedProject, importAsCopy } from "../features/project/transfer";
import { PURPOSE_CARDS, buildNewProject, validateCreateInput, type CreateInput } from "../features/project/createProject";
import { BOOTHS_MAX, BOOTHS_MIN, VISITORS_MAX, VISITORS_MIN } from "../shared/limits";

function markUnlocked(id: string): void {
  sessionStorage.setItem(`eventlab-unlock:${id}`, "1");
}

export function HomePage() {
  const navigate = useNavigate();
  const [input, setInput] = useState<CreateInput>({
    title: "",
    password: "",
    expectedVisitors: 200,
    boothCount: 8,
    purpose: "",
    customPurpose: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; title: string; updatedAt: string }>>([]);
  const [unlockId, setUnlockId] = useState<string | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [fails, setFails] = useState(0);
  const [importError, setImportError] = useState("");

  const fieldNames = useMemo(() => ["title", "password", "expectedVisitors", "boothCount", "purpose"], []);

  useEffect(() => {
    void listProjects().then(setProjects);
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateCreateInput(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }
    setBusy(true);
    try {
      const secrets = await hashEditPassword(input.password);
      const project = buildNewProject(input, secrets);
      await saveProject(project);
      markUnlocked(project.id);
      navigate(`/project/${project.id}`);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "저장에 실패했습니다." });
    } finally {
      setBusy(false);
    }
  }

  async function onUnlock(event: FormEvent) {
    event.preventDefault();
    if (!unlockId) {
      return;
    }
    const project = await loadProject(unlockId);
    if (!project) {
      setUnlockError("프로젝트를 찾지 못했습니다.");
      return;
    }
    const ok = await verifyEditPassword(unlockPassword, project.passwordSalt, project.passwordHash);
    if (!ok) {
      const next = fails + 1;
      setFails(next);
      await new Promise((resolve) => setTimeout(resolve, Math.min(2000, 400 * next)));
      setUnlockError("비밀번호가 올바르지 않습니다.");
      return;
    }
    markUnlocked(project.id);
    navigate(`/project/${project.id}`);
  }

  async function onImport(file: File) {
    setImportError("");
    if (file.size > 2_000_000) {
      setImportError("파일이 너무 큽니다.");
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseImportedProject(text);
      const copy = await importAsCopy(parsed);
      markUnlocked(copy.id);
      navigate(`/project/${copy.id}`);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "불러오기에 실패했습니다.");
    }
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-10 lg:grid-cols-2">
      <section>
        <h1 className="text-2xl font-semibold">행사구성 LAB</h1>
        <p className="mt-2 text-sm text-gray-600">회원가입 없이 이 기기에 행사를 만듭니다.</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => void onCreate(e)} noValidate>
          <label className="block text-sm">
            행사 제목
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              name="title"
              value={input.title}
              onChange={(e) => setInput({ ...input, title: e.target.value })}
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title ? <p className="mt-1 text-red-700">{errors.title}</p> : null}
          </label>
          <label className="block text-sm">
            편집 비밀번호
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="password"
              name="password"
              autoComplete="new-password"
              value={input.password}
              onChange={(e) => setInput({ ...input, password: e.target.value })}
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password ? <p className="mt-1 text-red-700">{errors.password}</p> : null}
          </label>
          <label className="block text-sm">
            예상 참여 인원
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="number"
              name="expectedVisitors"
              min={VISITORS_MIN}
              max={VISITORS_MAX}
              value={input.expectedVisitors}
              onChange={(e) => setInput({ ...input, expectedVisitors: Number(e.target.value) })}
              aria-invalid={Boolean(errors.expectedVisitors)}
            />
            {errors.expectedVisitors ? <p className="mt-1 text-red-700">{errors.expectedVisitors}</p> : null}
          </label>
          <label className="block text-sm">
            부스 개수
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="number"
              name="boothCount"
              min={BOOTHS_MIN}
              max={BOOTHS_MAX}
              value={input.boothCount}
              onChange={(e) => setInput({ ...input, boothCount: Number(e.target.value) })}
              aria-invalid={Boolean(errors.boothCount)}
            />
            {errors.boothCount ? <p className="mt-1 text-red-700">{errors.boothCount}</p> : null}
          </label>
          <fieldset>
            <legend className="text-sm">행사 목적</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PURPOSE_CARDS.map((card) => (
                <label key={card.id} className="flex items-center gap-2 rounded border bg-white px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="purpose"
                    checked={input.purpose === card.id}
                    onChange={() => setInput({ ...input, purpose: card.id })}
                  />
                  {card.label}
                </label>
              ))}
            </div>
            {errors.purpose ? <p className="mt-1 text-sm text-red-700">{errors.purpose}</p> : null}
          </fieldset>
          {input.purpose === "custom" ? (
            <label className="block text-sm">
              직접 입력
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={input.customPurpose}
                onChange={(e) => setInput({ ...input, customPurpose: e.target.value })}
              />
              {errors.customPurpose ? <p className="mt-1 text-red-700">{errors.customPurpose}</p> : null}
            </label>
          ) : null}
          {errors.form ? <p className="text-sm text-red-700">{errors.form}</p> : null}
          <button className="rounded bg-gray-900 px-4 py-2 text-sm text-white" disabled={busy} type="submit">
            {busy ? "저장 중…" : "새 행사 만들기"}
          </button>
          <p className="text-xs text-gray-500">{fieldNames.length}개 필드만 받습니다. 날짜·예산·로그인은 없습니다.</p>
        </form>
      </section>
      <section>
        <h2 className="text-lg font-medium">이 기기의 행사 열기</h2>
        <ul className="mt-3 space-y-2">
          {projects.length === 0 ? <li className="text-sm text-gray-500">저장된 행사가 없습니다.</li> : null}
          {projects.map((item) => (
            <li key={item.id}>
              <button className="w-full rounded border bg-white px-3 py-2 text-left text-sm" type="button" onClick={() => setUnlockId(item.id)}>
                {item.title}
              </button>
            </li>
          ))}
        </ul>
        {unlockId ? (
          <form className="mt-4 space-y-2 rounded border bg-white p-3" onSubmit={(e) => void onUnlock(e)}>
            <p className="text-sm">편집 비밀번호</p>
            <input className="w-full rounded border px-3 py-2" type="password" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} />
            {unlockError ? <p className="text-sm text-red-700">{unlockError}</p> : null}
            <button className="rounded bg-gray-900 px-3 py-1 text-sm text-white" type="submit">
              열기
            </button>
          </form>
        ) : null}
        <label className="mt-6 block text-sm">
          프로젝트 불러오기
          <input
            className="mt-1 block"
            type="file"
            accept="application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void onImport(file);
              }
            }}
          />
        </label>
        {importError ? <p className="text-sm text-red-700">{importError}</p> : null}
      </section>
    </main>
  );
}

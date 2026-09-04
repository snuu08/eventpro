import { Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { HomePage } from "./HomePage";
import { NotFoundPage } from "./NotFoundPage";
import { ProjectWorkspace } from "../features/project/ProjectWorkspace";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/project/:projectId" element={<ProjectWorkspace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

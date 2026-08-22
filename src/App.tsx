import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { EventSessionProvider } from "./state/EventSessionContext";
import { CreateEventPage } from "./pages/CreateEventPage";
import { MapSetupPage } from "./pages/MapSetupPage";

export default function App() {
  return (
    <EventSessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CreateEventPage />} />
          <Route path="/map" element={<MapSetupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </EventSessionProvider>
  );
}

import { useContext } from "react";
import { EventSessionContext } from "./sessionContext";
import type { EventSessionContextValue } from "./sessionContext";

export function useEventSession(): EventSessionContextValue {
  const value = useContext(EventSessionContext);
  if (!value) {
    throw new Error("useEventSession must be used within EventSessionProvider");
  }
  return value;
}

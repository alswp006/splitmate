// Stub for packet 0008 Split page
// Implementation will follow after test suite passes
import { useLocation } from "react-router-dom";
import type { RouteState } from "@/lib/types";

export default function Split() {
  const location = useLocation();
  void (location.state as RouteState["/new/split"] | null);
  return null;
}

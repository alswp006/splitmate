// Stub for packet 0009 Result page
// Implementation will follow after test suite passes
import { useLocation } from "react-router-dom";
import type { RouteState } from "@/lib/types";

export default function Result() {
  const location = useLocation();
  void (location.state as RouteState["/result"] | null);
  return null;
}

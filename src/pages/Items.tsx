// Stub for packet 0007 Items page
// Implementation will follow after test suite passes
import { useLocation } from "react-router-dom";
import type { RouteState } from "@/lib/types";

export default function Items() {
  const location = useLocation();
  void (location.state as RouteState["/new/items"] | null);
  return null;
}

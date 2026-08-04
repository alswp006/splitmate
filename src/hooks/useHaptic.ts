// Stub for packet 0011 useHaptic hook
// Implementation will follow after test suite passes (green phase)

export interface UseHapticResult {
  success: () => void;
  tickWeak: () => void;
  tickStrong: () => void;
}

export function useHaptic(): UseHapticResult {
  return {
    success: () => {},
    tickWeak: () => {},
    tickStrong: () => {},
  };
}

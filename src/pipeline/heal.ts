/**
 * Attempts to repair a truncated/malformed JSON fragment by closing any
 * still-open strings, brackets, and braces (in reverse order) before
 * re-attempting JSON.parse. Returns the parsed value, or null if the
 * fragment cannot be repaired into valid JSON.
 */
export function repairTruncatedJSON(fragment: string): unknown | null {
  if (!fragment) return null;

  const closers: string[] = [];
  let inString = false;
  let escaped = false;
  let repaired = "";

  for (const ch of fragment) {
    repaired += ch;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      closers.push("}");
    } else if (ch === "[") {
      closers.push("]");
    } else if (ch === "}" || ch === "]") {
      closers.pop();
    }
  }

  if (inString) {
    repaired += '"';
  }

  repaired = repaired.replace(/,\s*$/, "");

  while (closers.length > 0) {
    repaired += closers.pop();
  }

  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

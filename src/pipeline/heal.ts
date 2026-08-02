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

export interface ChunkParseError {
  index: number;
  message: string;
}

export interface ParseChunkedResponseResult {
  chunks: unknown[];
  errors: ChunkParseError[];
}

/**
 * Parses a response made of newline-delimited JSON chunks, repairing
 * truncated fragments per-line so a single bad chunk doesn't invalidate
 * the rest (each chunk is parsed/validated independently, then callers
 * merge the successful ones).
 */
export function parseChunkedResponse(content: string): ParseChunkedResponseResult {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const chunks: unknown[] = [];
  const errors: ChunkParseError[] = [];

  lines.forEach((line, index) => {
    try {
      chunks.push(JSON.parse(line));
      return;
    } catch {
      // fall through to repair
    }

    const repaired = repairTruncatedJSON(line);
    if (repaired !== null) {
      chunks.push(repaired);
    } else {
      errors.push({ index, message: "청크를 파싱/복구할 수 없습니다" });
    }
  });

  return { chunks, errors };
}

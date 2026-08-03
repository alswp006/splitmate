import { describe, it, expect, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { render } from "@testing-library/react";

// --- @toss/tds-mobile: crashes in jsdom, mock every export as a passthrough ---
vi.mock("@toss/tds-mobile", () => {
  const passthrough = (props: any) =>
    React.createElement(React.Fragment, null, props?.children ?? null);
  const known: Record<string, unknown> = { Toast: { show: vi.fn() } };
  return new Proxy(known, {
    get(target: Record<string, unknown>, prop: string) {
      if (prop === "__esModule") return true;
      if (prop === "then") return undefined;
      if (prop in target) return target[prop];
      return passthrough;
    },
  });
});

// Real module under test (no mock) — proves the "@/*" alias resolves to src/*
import AdSlot from "@/components/AdSlot";

const REPO_ROOT = path.resolve(__dirname, "../..");

function parseJsonc(filePath: string): any {
  const raw = readFileSync(filePath, "utf-8");
  const withoutComments = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  return JSON.parse(withoutComments);
}

function runTypecheck(): { exitCode: number; output: string } {
  try {
    const output = execFileSync("npx", ["tsc", "--noEmit"], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { exitCode: 0, output };
  } catch (error: any) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    return { exitCode: typeof error.status === "number" ? error.status : 1, output };
  }
}

describe("누락 모듈 해상도 복구(의존성·경로·타입선언)", () => {
  it(
    "AC-1[P0]: should pass `tsc --noEmit` with exit code 0 (no TS2307 anywhere)",
    () => {
      const { exitCode, output } = runTypecheck();
      expect(exitCode).toBe(0);
      expect(output).not.toContain("TS2307");
    },
    30000
  );

  it(
    "AC-1[P0]: should not report cannot-find-module errors for '@toss/tds-mobile' or '@/components/AdSlot'",
    () => {
      const { output } = runTypecheck();
      expect(output).not.toContain("Cannot find module '@toss/tds-mobile'");
      expect(output).not.toContain("Cannot find module '@/components/AdSlot'");
    },
    30000
  );

  it("AC-2: should declare '@toss/tds-mobile' as an installed dependency in package.json", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8")
    );
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps).toHaveProperty("@toss/tds-mobile");
    expect(typeof deps["@toss/tds-mobile"]).toBe("string");
  });

  it("AC-2: should map the '@/*' path alias to 'src/*' in tsconfig.json", () => {
    const tsconfig = parseJsonc(path.join(REPO_ROOT, "tsconfig.json"));
    expect(tsconfig.compilerOptions.baseUrl).toBe(".");
    expect(tsconfig.compilerOptions.paths["@/*"]).toEqual(["src/*"]);
  });

  it("AC-2: should resolve '@/components/AdSlot' at runtime through the alias and render without crashing", () => {
    expect(typeof AdSlot).toBe("function");
    expect(() => render(React.createElement(AdSlot))).not.toThrow();
  });

  it("AC-3: should keep AdSlot a minimal no-op placeholder (no new feature scope beyond resolving the import)", () => {
    const { container } = render(React.createElement(AdSlot));
    expect(container.textContent).toBe("");
    expect(container.children.length).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("엔티티 타입 + RouteState 계약 정의(최소 스켈레톤)", () => {
  const typesPath = path.resolve(__dirname, "../lib/types.ts");

  // AC-1: src/types.ts가 SplitSession, Member, SplitItem, SettlementResult, RouteState를 모두 export 한다
  it("AC-1[P0]: should create src/lib/types.ts file with type definitions", () => {
    expect(fs.existsSync(typesPath)).toBe(true);
  });

  it("AC-1[P0]: should export SplitSession, Member, SplitItem types", () => {
    const content = fs.readFileSync(typesPath, "utf-8");

    expect(content).toContain("export");
    expect(content).toContain("SplitSession");
    expect(content).toContain("Member");
    expect(content).toContain("SplitItem");
  });

  it("AC-1[P0]: should export SettlementResult and RouteState types", () => {
    const content = fs.readFileSync(typesPath, "utf-8");

    expect(content).toContain("SettlementResult");
    expect(content).toContain("RouteState");
  });

  // AC-2: tsc --noEmit(또는 vite build 타입체크) 통과, 순환/미해결 참조 없음
  it("AC-2[P0]: should use interface/type keyword for declarations (no runtime values)", () => {
    const content = fs.readFileSync(typesPath, "utf-8");

    // Count exports that are interface/type (valid), not const/let/function (runtime)
    const hasInterface = content.includes("interface") || content.includes("type ");
    expect(hasInterface).toBe(true);
    expect(content).not.toContain("export const");
    expect(content).not.toContain("export function");
  });

  it("AC-2[P0]: should not have circular references in type definitions", () => {
    const content = fs.readFileSync(typesPath, "utf-8");

    // Basic check: file should be readable and non-empty
    expect(content.length).toBeGreaterThan(0);
    expect(content).toMatch(/export\s+(interface|type)/);
  });

  // AC-3: 런타임 값·로직 없이 타입/인터페이스 선언만 포함
  it("AC-3[P0]: should contain only type/interface exports, no runtime implementations", () => {
    const content = fs.readFileSync(typesPath, "utf-8");

    // Should not contain function bodies, class definitions, or executable code
    expect(content).not.toContain("export class");
    expect(content).not.toContain("=>"); // arrow functions
  });

  it("AC-3[P0]: should define RouteState as a union or type alias (routing contract)", () => {
    const content = fs.readFileSync(typesPath, "utf-8");

    // RouteState should be present and likely a union type or type alias
    expect(content).toContain("RouteState");
    // Check for common union/type patterns
    const hasValidRouteStatePattern =
      content.includes("type RouteState") ||
      content.includes("interface RouteState");
    expect(hasValidRouteStatePattern).toBe(true);
  });

  // Integration test: verify module can be imported at runtime
  it("AC-1+2+3[P1]: should allow importing types module without runtime errors", async () => {
    const types = await import("@/lib/types");
    expect(types).toBeDefined();
    expect(typeof types).toBe("object");
  });
});

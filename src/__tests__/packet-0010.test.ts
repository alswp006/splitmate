import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { getFlags } from "@/lib/storage";

// 이 패킷은 실제 react-router-dom 라우팅(useNavigate/useLocation 실동작)이 필요하다 —
// mockRouter()는 useNavigate/useLocation을 고정 mock으로 대체해 라우트 전환을 무력화하므로
// 여기서는 TDS/SDK/광고만 mock하고 라우터는 실제 것을 사용한다.
mockTds();
mockAppsInToss();
mockTossRewardAd();

import App from "@/App";

const SRC_ROOT = path.resolve(__dirname, "../..", "src");

function readSrc(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, "../..", relPath), "utf-8");
}

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") return [];
      return walk(full);
    }
    if (/\.(tsx?|jsx?)$/.test(entry.name)) return [full];
    return [];
  });
}

describe("라우팅 배선 · 온보딩 게이트 · 검수 컴플라이언스", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("splitmate:flags", JSON.stringify({ onboarded: true }));
  });

  // ============================================================================
  // AC-1: Routes에 5개 경로가 각 페이지로 연결됨
  // ============================================================================

  it("AC-1[P0]: 5개 라우트가 각각 대응 페이지 컴포넌트로 렌더된다", () => {
    const routes: Array<{ path: string; heading: string; state?: unknown }> = [
      { path: "/", heading: "정산 내역" },
      { path: "/new", heading: "정산 정보" },
      {
        path: "/new/items",
        heading: "항목 입력",
        state: {
          title: "제주 여행",
          participants: [
            { id: "p1", name: "지민" },
            { id: "p2", name: "현우" },
          ],
        },
      },
      {
        path: "/new/split",
        heading: "분할 설정",
        state: {
          title: "제주 여행",
          participants: [
            { id: "p1", name: "지민" },
            { id: "p2", name: "현우" },
          ],
          items: [{ id: "i1", label: "저녁", amount: 40000, participantIds: ["p1", "p2"] }],
        },
      },
      { path: "/result", heading: "정산 결과", state: { settlementId: "missing-id" } },
    ];

    for (const route of routes) {
      const { unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [{ pathname: route.path, state: route.state ?? null }],
      });
      expect(screen.getByText(route.heading)).toBeInTheDocument();
      unmount();
    }
  });

  it("AC-1[P0-error]: 정의되지 않은 경로는 홈(`/`)으로 리다이렉트된다", () => {
    renderWithRouter(React.createElement(App), {
      initialEntries: ["/does-not-exist"],
    });

    expect(screen.getByText("정산 내역")).toBeInTheDocument();
    expect(screen.queryByText("정산 정보")).not.toBeInTheDocument();
  });

  // ============================================================================
  // AC-2: App.tsx가 유일한 라우팅 소유자
  // ============================================================================

  it("AC-2[P0]: `<Routes` 선언은 src 전체에서 App.tsx에만 존재한다(단일 진입점)", () => {
    const files = walk(SRC_ROOT);
    const filesWithRoutes = files.filter((f) => fs.readFileSync(f, "utf-8").includes("<Routes"));
    const relFiles = filesWithRoutes.map((f) => path.relative(SRC_ROOT, f));

    expect(relFiles).toEqual(["App.tsx"]);
    expect(relFiles.length).toBe(1);
  });

  // ============================================================================
  // AC-3: 온보딩 게이트 — getFlags().onboarded=false면 1회 노출 후 setOnboarded
  // ============================================================================

  it("AC-3[P0]: 최초 진입(onboarded=false) 시 온보딩 AlertDialog가 뜨고 '시작하기' 탭 시 onboarded가 저장된다", async () => {
    localStorage.setItem("splitmate:flags", JSON.stringify({ onboarded: false }));

    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/항목별·비균등 정산을 간편하게/);

    const startButton = screen.getByRole("button", { name: /시작하기/ });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(getFlags().onboarded).toBe(true);
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("AC-3[P0-error]: 이미 onboarded=true면 다시 진입해도 온보딩이 재노출되지 않는다", () => {
    localStorage.setItem("splitmate:flags", JSON.stringify({ onboarded: true }));

    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(getFlags().onboarded).toBe(true);
  });

  // ============================================================================
  // AC-4: 외부 앱 설치 유도·외부 http(s) 이동 코드 부재
  // ============================================================================

  it("AC-4[P0]: App.tsx/OnboardingGate.tsx에 외부 이동·설치유도 코드가 없다", () => {
    const appSrc = readSrc("src/App.tsx");
    const gateSrc = readSrc("src/components/OnboardingGate.tsx");

    for (const src of [appSrc, gateSrc]) {
      expect(src).not.toMatch(/window\.location\.href\s*=/);
      expect(src).not.toMatch(/window\.open\(/);
      expect(src).not.toMatch(/앱\s*설치|다운로드\s*받기/);
      expect(src).not.toMatch(/https?:\/\//);
    }
  });

  // ============================================================================
  // AC-5: main.tsx 미수정, 앱 부팅 및 라우트 전환 정상 동작, FloatingTabBar 배선
  // ============================================================================

  it("AC-5[P0]: main.tsx는 @AI:ANCHOR 그대로이며 App.tsx가 BrowserRouter를 재선언하지 않는다", () => {
    const mainSrc = readSrc("src/main.tsx");
    const appSrc = readSrc("src/App.tsx");

    expect(mainSrc).toMatch(/@AI:ANCHOR/);
    expect(mainSrc).toMatch(/<BrowserRouter/);
    expect(appSrc).not.toMatch(/<BrowserRouter/);
    expect(appSrc).not.toMatch(/from ["']react-router-dom["'][^;]*BrowserRouter/);
  });

  it("AC-5[P0]: 홈 탭 루트에서만 FloatingTabBar(role=tablist)가 렌더된다", () => {
    const { unmount } = renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    const tablist = screen.getByRole("tablist");
    expect(tablist).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(1);
    expect(tabs.some((tab) => tab.getAttribute("aria-selected") === "true")).toBe(true);
    unmount();

    renderWithRouter(React.createElement(App), {
      initialEntries: [{ pathname: "/new", state: null }],
    });
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("AC-5[P1]: 홈에서 '새 정산 시작' 탭 시 실제로 `/new`로 라우트 전환된다", async () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    const startButton = await screen.findByRole("button", { name: /새 정산 시작/ });
    fireEvent.click(startButton);

    expect(await screen.findByText("정산 정보")).toBeInTheDocument();
    expect(screen.queryByText("정산 내역")).not.toBeInTheDocument();
  });
});

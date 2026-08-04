import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Asset } from '@toss/tds-mobile';
import Home from './pages/Home';
import NewSettlement from './pages/NewSettlement';
import Items from './pages/Items';
import Split from './pages/Split';
import Result from './pages/Result';
import { FloatingTabBar, type TabItem } from './components/FloatingTabBar';
import { OnboardingGate } from './components/OnboardingGate';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

// 하단 탭 — 홈 탭 루트('/')에서만 노출. 활성탭은 아이콘+라벨 컬러 틴트(솔리드 알약 금지).
const TABS: TabItem[] = [
  {
    label: '홈',
    path: '/',
    icon: <Asset.ContentIcon name="iconHomeRegular" alt="홈" style={{ width: 22, height: 22 }} />,
  },
  {
    label: '새 정산',
    path: '/new',
    icon: <Asset.ContentIcon name="iconReceiptRegular" alt="새 정산" style={{ width: 22, height: 22 }} />,
  },
];

export default function App() {
  const location = useLocation();
  console.log("APP-RENDER path=", location.pathname, "state=", JSON.stringify(location.state));
  // 탭 루트(홈)에서만 하단 탭을 그린다 — 마법사 단계(/new·/result 등)에서는 숨긴다.
  const showTabBar = location.pathname === '/';

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<NewSettlement />} />
        <Route path="/new/items" element={<Items />} />
        <Route path="/new/split" element={<Split />} />
        <Route path="/result" element={<Result />} />
        {DevTdsGallery && (
          <Route
            path="/__tds-gallery"
            element={
              <Suspense fallback={null}>
                <DevTdsGallery />
              </Suspense>
            }
          />
        )}
        {/* 정의되지 않은 경로는 홈으로 되돌린다. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showTabBar && <FloatingTabBar items={TABS} />}
      <OnboardingGate />
    </>
  );
}

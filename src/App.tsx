import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Home from './pages/Home';
import NewSettlement from './pages/NewSettlement';
import Items from './pages/Items';
import Split from './pages/Split';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/new" element={<NewSettlement />} />
      <Route path="/new/items" element={<Items />} />
      <Route path="/new/split" element={<Split />} />
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
    </Routes>
  );
}

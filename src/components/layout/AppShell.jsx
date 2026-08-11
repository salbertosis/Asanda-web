import React, { Suspense } from 'react';
import Header from '../Header';
import Footer from '../Footer';
import SkipLink from './SkipLink';
import RouteHead from './RouteHead';

const LoadingShell = () => (
  <main id="main-content" tabIndex={-1}>
    <div className="min-h-48 p-8 text-center" role="status">Cargando…</div>
  </main>
);

const AppShell = ({ children }) => (
  <>
    <RouteHead />
    <SkipLink />
    <Header />
    <Suspense fallback={<LoadingShell />}>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <Footer />
    </Suspense>
  </>
);

export default AppShell;

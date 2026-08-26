import React, { Suspense } from 'react';
import Header from '../Header';
import Footer from '../Footer';
import SkipLink from './SkipLink';
import { RouteHeadProvider } from './RouteHead';

const LoadingShell = () => (
  <main id="main-content" tabIndex={-1}>
    <div className="min-h-48 p-8 text-center" role="status">Cargando…</div>
  </main>
);

const AppShell = ({ children }) => (
  <RouteHeadProvider>
    <SkipLink />
    <Header />
    <Suspense fallback={<LoadingShell />}>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <Footer />
    </Suspense>
  </RouteHeadProvider>
);

export default AppShell;

import React from 'react';
import Header from '../Header';
import Footer from '../Footer';
import SkipLink from './SkipLink';
import RouteHead from './RouteHead';

const AppShell = ({ children }) => (
  <>
    <RouteHead />
    <SkipLink />
    <Header />
    <main id="main-content" tabIndex={-1}>
      {children}
    </main>
    <Footer />
  </>
);

export default AppShell;

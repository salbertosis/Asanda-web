import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Image,
  Menu,
  Newspaper,
  PlaySquare,
  Star,
  TimerReset,
  Users,
  Waves,
  X,
} from 'lucide-react';

const sports = ['Natación', 'Waterpolo', 'Aguas abiertas'];

const latestItems = [
  { label: 'Noticias', href: '/noticias', icon: Newspaper },
  { label: 'Videos', href: '/videos', icon: PlaySquare },
  { label: 'Fotos', href: '/fotos', icon: Image },
];

const navItems = [
  { label: 'Calendario', href: '/calendario', icon: CalendarDays },
  { label: 'Resultados', href: '/resultados', icon: BarChart3 },
  { label: 'Atletas', href: '/atletas', icon: Users },
  { label: 'Destacados', href: '/#atletas', icon: Star },
  { label: 'Récord estadal', href: '/record-estadal', icon: TimerReset },
];

const Header = () => {
  const { pathname, hash } = useLocation();
  const headerRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 12);

  const closeMenus = () => {
    setMobileOpen(false);
    setOpenMenu(null);
  };

  useEffect(() => {
    closeMenus();
  }, [pathname, hash]);

  useEffect(() => {
    if (pathname !== '/' || hash !== '#atletas') return undefined;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById('atletas')?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    const handlePointerDown = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeMenus();
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const isActive = (href) => (
    href.includes('#')
      ? `${pathname}${hash}` === href
      : pathname === href || pathname.startsWith(`${href}/`)
  );
  const latestActive = latestItems.some(({ href }) => isActive(href));

  const toggleMenu = (menu) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  return (
    <>
      <div aria-hidden="true" className="h-[108px] lg:h-[116px]" data-testid="site-header-spacer" />
      <header ref={headerRef} className="fixed inset-x-0 top-0 z-50" data-testid="site-header" data-compact={scrolled ? 'true' : 'false'}>
      <div className={`overflow-hidden bg-[#e2612d] text-[#0b2530] transition-[height,border-color] duration-200 motion-reduce:transition-none ${scrolled ? 'h-0 border-transparent' : 'h-8 border-b border-black/10'}`}>
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-center px-4 text-center text-[11px] font-bold uppercase tracking-[0.04em] sm:justify-between sm:px-5 sm:text-[13px]">
          <span>Portal oficial de los deportes acuáticos</span>
          <span className="hidden sm:inline">Anzoátegui · Venezuela</span>
        </div>
      </div>

      <div
        className={`border-b-4 border-asanda-orange bg-[#e8f5f1] backdrop-blur-md transition-shadow duration-200 ${
          scrolled ? 'shadow-[0_12px_30px_rgba(22,70,184,0.14)]' : ''
        }`}
      >
        <div className={`mx-auto flex max-w-7xl items-center gap-5 px-4 transition-[height] duration-200 motion-reduce:transition-none sm:px-5 ${scrolled ? 'h-16' : 'h-[72px] lg:h-20'}`}>
          <Link
            to="/"
            aria-label="ASANDA, ir al inicio"
            aria-current={pathname === '/' ? 'page' : undefined}
            className="flex min-w-0 max-w-[calc(100%-64px)] items-center gap-3 rounded-sm"
            onClick={(event) => {
              if (pathname === '/') {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <img src="/asanda.png" alt="" className={`h-auto max-w-full object-contain transition-[width,height] duration-200 motion-reduce:transition-none sm:w-auto ${scrolled ? 'w-[180px] sm:h-10' : 'w-[210px] sm:h-12 lg:h-14'}`} />
            <span className="hidden border-l border-asanda-line pl-3 2xl:block">
              <span className="font-display block text-lg font-bold uppercase leading-none tracking-wide text-asanda-ink">
                ASANDA
              </span>
              <span className="mt-1 block max-w-52 text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-slate-500">
                Asociación de Deportes Acuáticos del Estado Anzoátegui
              </span>
            </span>
          </Link>

          <nav aria-label="Navegación principal" className="ml-auto hidden items-center gap-1 xl:flex">
            <div className="relative">
              <button
                type="button"
                aria-expanded={openMenu === 'sports'}
                aria-controls="sports-menu"
                onClick={() => toggleMenu('sports')}
                className="flex min-h-11 items-center gap-2 rounded-sm px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-[#eef3ff] hover:text-asanda-navy"
              >
                Deportes
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`transition-transform ${openMenu === 'sports' ? 'rotate-180' : ''}`}
                />
              </button>
              {openMenu === 'sports' && (
                <div
                  id="sports-menu"
                  className="absolute left-0 top-full mt-2 w-64 border border-asanda-line bg-white p-2 shadow-[0_18px_45px_rgba(6,26,46,0.18)]"
                >
                  <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Disciplinas de la asociación
                  </p>
                  {sports.map((sport) => (
                    <div key={sport} className="flex items-center gap-3 border-t border-slate-100 px-3 py-3 text-sm font-semibold text-asanda-ink">
                      <Waves size={18} aria-hidden="true" className="text-asanda-cyan" />
                      {sport}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                aria-expanded={openMenu === 'latest'}
                aria-controls="latest-menu"
                onClick={() => toggleMenu('latest')}
                className={`flex min-h-11 items-center gap-2 rounded-sm px-3 text-sm font-bold transition-colors hover:bg-[#eef3ff] hover:text-asanda-navy ${
                  latestActive ? 'bg-[#eef3ff] text-asanda-navy' : 'text-slate-700'
                }`}
              >
                Actualidad
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`transition-transform ${openMenu === 'latest' ? 'rotate-180' : ''}`}
                />
              </button>
              {openMenu === 'latest' && (
                <div
                  id="latest-menu"
                  className="absolute left-0 top-full mt-2 w-56 border border-asanda-line bg-white p-2 shadow-[0_18px_45px_rgba(6,26,46,0.18)]"
                >
                  {latestItems.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={href}
                      to={href}
                      aria-current={isActive(href) ? 'page' : undefined}
                      className={`flex min-h-11 items-center gap-3 px-3 text-sm font-semibold transition-colors hover:bg-asanda-foam hover:text-asanda-blue ${
                        isActive(href) ? 'bg-asanda-foam text-asanda-blue' : 'text-slate-700'
                      }`}
                    >
                      <Icon size={18} aria-hidden="true" />
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {navItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                aria-current={isActive(href) ? 'page' : undefined}
                className={`relative flex min-h-11 items-center gap-2 px-3 text-sm font-bold transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-asanda-orange after:transition-transform ${
                  isActive(href)
                    ? 'bg-[#eef3ff] text-asanda-navy after:scale-x-100'
                    : 'text-slate-700 after:scale-x-0 hover:bg-[#eef3ff] hover:text-asanda-navy hover:after:scale-x-100'
                }`}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 xl:ml-0">
            <button
              type="button"
              aria-label={mobileOpen ? 'Cerrar menú principal' : 'Abrir menú principal'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              onClick={() => {
                setMobileOpen((current) => !current);
                setOpenMenu(null);
              }}
              className="inline-flex size-11 shrink-0 items-center justify-center bg-transparent text-asanda-deep transition-colors hover:bg-asanda-deep/10 xl:hidden"
            >
              {mobileOpen ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div id="mobile-navigation" className={`${scrolled ? 'max-h-[calc(100vh-64px)]' : 'max-h-[calc(100vh-104px)]'} overflow-y-auto border-b border-asanda-line bg-white shadow-xl xl:hidden`}>
          <nav aria-label="Navegación móvil" className="mx-auto max-w-7xl px-4 py-5 sm:px-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Explorar</p>
            <div className="grid gap-px overflow-hidden border border-asanda-line bg-asanda-line sm:grid-cols-2">
              {[...navItems, ...latestItems].map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  to={href}
                  aria-current={isActive(href) ? 'page' : undefined}
                  className={`flex min-h-14 items-center gap-3 bg-white px-4 font-bold transition-colors hover:bg-asanda-foam hover:text-asanda-blue ${
                    isActive(href) ? 'text-asanda-blue' : 'text-asanda-ink'
                  }`}
                >
                  <Icon size={19} aria-hidden="true" className="text-asanda-blue" />
                  {label}
                </Link>
              ))}
            </div>

            <div className="mt-5 border-l-2 border-asanda-cyan pl-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Disciplinas</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{sports.join(' · ')}</p>
            </div>
          </nav>
        </div>
      )}
      </header>
    </>
  );
};

export default Header;

import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  FileCheck2,
  Image,
  LogOut,
  Medal,
  Newspaper,
  Star,
  Users,
} from "lucide-react";
import DarkModeToggle from "../components/DarkModeToggle";
import { useAdminSession } from "./AdminSessionContext";

const roleLabel = { administrator: "Administrador", editor: "Editor" };
const modules = [
  ["/admin/noticias", "Noticias", Newspaper],
  ["/admin/media", "Imágenes", Image],
  ["/admin/destacados", "Destacados", Star],
  ["/admin/atletas", "Atletas", Users],
  ["/admin/clubes", "Clubes", Building2],
  ["/admin/calendario", "Calendario", CalendarDays],
  ["/admin/resultados", "Resultados", FileCheck2],
  ["/admin/records", "Récords", Medal],
];

const navItem = ({ isActive }) =>
  `inline-flex min-h-12 min-w-11 shrink-0 items-center gap-2 border-b-2 px-3 font-bold transition-colors motion-reduce:transition-none ${
    isActive
      ? "border-asanda-orange text-asanda-orange"
      : "border-transparent text-asanda-deep hover:text-asanda-orange dark:text-slate-200 dark:hover:text-asanda-orange"
  }`;

const AdminShell = () => {
  const { profile, signOut } = useAdminSession();
  const { pathname } = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    const destination = mainRef.current?.querySelector("h1") || mainRef.current;
    destination?.setAttribute("tabindex", "-1");
    destination?.focus({ preventScroll: true });
  }, [pathname]);

  const focusMain = (event) => {
    event.preventDefault();
    mainRef.current?.focus();
    mainRef.current?.scrollIntoView();
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-asanda-foam text-asanda-ink dark:bg-dark-bg dark:text-dark-text">
      <a
        href="#admin-main"
        onClick={focusMain}
        className="fixed left-3 top-3 z-[60] -translate-y-[200%] bg-asanda-ink px-4 py-3 font-bold text-white shadow-lg transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        Saltar al contenido principal
      </a>
      <header className="border-b-4 border-asanda-orange bg-white dark:border-slate-700 dark:bg-dark-surface">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-5">
          <img
            src="/asanda.png"
            alt="ASANDA"
            className="h-auto w-32 shrink-0 sm:w-40"
          />
          <div className="ml-auto min-w-0 text-right">
            <p className="truncate font-bold">{profile.display_name}</p>
            <p className="text-xs uppercase tracking-wide text-asanda-deep dark:text-slate-300">
              {roleLabel[profile.role]}
            </p>
          </div>
          <DarkModeToggle />
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center gap-2 px-3 font-bold text-asanda-deep transition-colors hover:bg-asanda-mist motion-reduce:transition-none dark:text-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar sesión"
          >
            <LogOut size={19} aria-hidden="true" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>
      <nav
        aria-label="Módulos de administración"
        className="max-w-full border-b border-asanda-line bg-white dark:border-slate-700 dark:bg-dark-surface"
      >
        <div
          data-admin-nav
          className="mx-auto flex max-w-7xl items-stretch gap-1 overflow-x-auto px-4 sm:px-5"
        >
          {modules.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} className={navItem}>
              <Icon size={17} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main
        id="admin-main"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-8 focus:outline focus:outline-2 focus:outline-offset-[-2px] focus:outline-asanda-orange sm:px-5 sm:py-10"
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AdminShell;

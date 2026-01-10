import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, BarChart3, Users, Calendar, Newspaper, Video, ChevronDown, Waves, UsersRound, Droplet } from 'lucide-react';

const Header = () => {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [deportesAbierto, setDeportesAbierto] = useState(false);
  const [loUltimoAbierto, setLoUltimoAbierto] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const deportesRef = useRef(null);
  const loUltimoRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (deportesRef.current && !deportesRef.current.contains(event.target)) {
        setDeportesAbierto(false);
      }
      if (loUltimoRef.current && !loUltimoRef.current.contains(event.target)) {
        setLoUltimoAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const deportes = [
    { label: 'Natación', icon: Waves, href: '#natacion' },
    { label: 'Waterpolo', icon: UsersRound, href: '#waterpolo' },
    { label: 'Aguas Abiertas', icon: Droplet, href: '#aguas-abiertas' },
  ];

  const loUltimoItems = [
    { label: 'Noticias', icon: Newspaper, href: '/noticias' },
    { label: 'Videos', icon: Video, href: '/videos' },
    { label: 'Fotos', icon: Newspaper, href: '/fotos' },
  ];

  const navItems = [
    { href: '/calendario', label: 'Calendario', icon: Calendar },
    { href: '/resultados', label: 'Resultados', icon: BarChart3 },
    { href: '/atletas', label: 'Atletas', icon: Users },
    { href: '/#record-estadal', label: 'Récord Estadal', icon: BarChart3 },
  ];

  return (
    <>
      {/* Barra Superior */}
      <div className="bg-gray-900 text-white text-xs py-1.5">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Portal Oficial de Deportes Acuáticos</span>
            <div className="hidden md:flex items-center gap-4 text-gray-400">
              <span>Anzoátegui, Venezuela</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header Principal */}
      <header className={`bg-white sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'shadow-lg' : 'shadow-sm'
      }`}>
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-20 lg:h-24">
            {/* Logo */}
            <Link to="/" className="flex items-center flex-1 min-w-0">
              <div className="flex-shrink-0">
                <img 
                  src="/asanda.png" 
                  alt="ASANDA" 
                  className="h-14 lg:h-16 w-auto object-contain"
                />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-1">
              {/* Deportes Dropdown */}
              <div ref={deportesRef} className="relative">
                <button
                  onClick={() => {
                    setDeportesAbierto(!deportesAbierto);
                    setLoUltimoAbierto(false);
                  }}
                  className={`group relative px-4 py-2 text-gray-700 hover:text-blue-600 font-medium text-sm transition-all duration-200 flex items-center gap-2 rounded-lg hover:bg-blue-50 ${
                    deportesAbierto ? 'text-blue-600 bg-blue-50' : ''
                  }`}
                >
                  <span>Deportes</span>
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform ${deportesAbierto ? 'rotate-180' : ''}`}
                  />
                </button>
                {deportesAbierto && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    {deportes.map((deporte) => {
                      const Icon = deporte.icon;
                      return (
                        <Link
                          key={deporte.href}
                          to={deporte.href}
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => setDeportesAbierto(false)}
                        >
                          <Icon size={20} className="text-blue-600" />
                          <span className="font-medium">{deporte.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Lo Último Dropdown */}
              <div ref={loUltimoRef} className="relative">
                <button
                  onClick={() => {
                    setLoUltimoAbierto(!loUltimoAbierto);
                    setDeportesAbierto(false);
                  }}
                  className={`group relative px-4 py-2 text-gray-700 hover:text-blue-600 font-medium text-sm transition-all duration-200 flex items-center gap-2 rounded-lg hover:bg-blue-50 ${
                    loUltimoAbierto ? 'text-blue-600 bg-blue-50' : ''
                  }`}
                >
                  <span>Lo Último</span>
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform ${loUltimoAbierto ? 'rotate-180' : ''}`}
                  />
                </button>
                {loUltimoAbierto && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    {loUltimoItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => setLoUltimoAbierto(false)}
                        >
                          <Icon size={20} className="text-blue-600" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Otros items de navegación */}
              {navItems.map((item) => {
                const Icon = item.icon;
                const isHashLink = item.href.startsWith('/#');
                if (isHashLink) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className="group relative px-4 py-2 text-gray-700 hover:text-blue-600 font-medium text-sm transition-all duration-200 flex items-center gap-2 rounded-lg hover:bg-blue-50"
                    >
                      <Icon size={18} className="transition-transform group-hover:scale-110" />
                      <span>{item.label}</span>
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="group relative px-4 py-2 text-gray-700 hover:text-blue-600 font-medium text-sm transition-all duration-200 flex items-center gap-2 rounded-lg hover:bg-blue-50"
                  >
                    <Icon size={18} className="transition-transform group-hover:scale-110" />
                    <span>{item.label}</span>
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuAbierto(!menuAbierto)}
              className="xl:hidden text-gray-700 hover:text-blue-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Menú"
            >
              {menuAbierto ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Línea Decorativa Inferior */}
        <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600"></div>

        {/* Mobile Navigation */}
        {menuAbierto && (
          <div className="xl:hidden border-t border-gray-200 bg-white">
            <nav className="container mx-auto px-4 py-4">
              <div className="flex flex-col gap-1">
                {/* Deportes Mobile */}
                <div>
                  <button
                    onClick={() => setDeportesAbierto(!deportesAbierto)}
                    className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium rounded-lg transition-colors"
                  >
                    <span>Deportes</span>
                    <ChevronDown size={16} className={deportesAbierto ? 'rotate-180' : ''} />
                  </button>
                  {deportesAbierto && (
                    <div className="pl-4 mt-1 space-y-1">
                      {deportes.map((deporte) => {
                        const Icon = deporte.icon;
                        return (
                          <Link
                            key={deporte.href}
                            to={deporte.href}
                            onClick={() => {
                              setMenuAbierto(false);
                              setDeportesAbierto(false);
                            }}
                            className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Icon size={18} className="text-blue-600" />
                            <span>{deporte.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Lo Último Mobile */}
                <div>
                  <button
                    onClick={() => setLoUltimoAbierto(!loUltimoAbierto)}
                    className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium rounded-lg transition-colors"
                  >
                    <span>Lo Último</span>
                    <ChevronDown size={16} className={loUltimoAbierto ? 'rotate-180' : ''} />
                  </button>
                  {loUltimoAbierto && (
                    <div className="pl-4 mt-1 space-y-1">
                      {loUltimoItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => {
                              setMenuAbierto(false);
                              setLoUltimoAbierto(false);
                            }}
                            className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Icon size={18} className="text-blue-600" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Otros items mobile */}
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isHashLink = item.href.startsWith('/#');
                  if (isHashLink) {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuAbierto(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium rounded-lg transition-colors"
                      >
                        <Icon size={20} />
                        <span>{item.label}</span>
                      </a>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMenuAbierto(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium rounded-lg transition-colors"
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;

import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, User, Heart, Search, MapPin, Car, ChevronDown } from 'lucide-react';
import { useCartStore, useAuthStore, useConfigStore, useWishlistStore, useVehicleStore, useLocationStore } from '../store/store';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LocationModal from './LocationModal';
import VehicleModal from './VehicleModal';

export default function Navbar() {
  const { items } = useCartStore();
  const { user, logout } = useAuthStore();
  const { config } = useConfigStore();
  const wishlist = useWishlistStore();
  const { vehicle } = useVehicleStore();
  const { location: userLocation } = useLocationStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const navigate = useNavigate();

  const cartItemsCount = items.reduce((acc, item) => acc + item.qty, 0);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalogo?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
      <VehicleModal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} />
      
      <header className="w-full flex flex-col font-sans">
        {/* Top Bar - Gris Oscuro */}
        <div className="bg-slate-800 text-slate-300 text-xs py-1.5 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end gap-6">
            <Link to="/tiendas" className="hover:text-white transition-colors">Nuestras Tiendas</Link>
            <Link to="/seguimiento" className="hover:text-white transition-colors">Seguimiento Pedidos</Link>
            <Link to="/talleres" className="hover:text-white transition-colors">Talleres Registrados</Link>
            <Link to="/empresas" className="hover:text-white transition-colors">Venta Empresas</Link>
          </div>
        </div>

        {/* Main Header - Blanco */}
        <div className="bg-white border-b border-slate-100 py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 lg:gap-8">
            
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center gap-1">
              <span className="text-3xl font-black tracking-tighter" style={{ color: config?.primaryColor || '#ea580c' }}>
                {config?.logoText1 || 'AUTO'}<span className="text-slate-900">{config?.logoText2 || 'PRO'}</span>
              </span>
            </Link>

            {/* Buscador Central */}
            <div className="hidden md:flex flex-grow max-w-2xl relative">
              <form onSubmit={handleSearch} className="w-full relative">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="¿Qué estás buscando? (ej. Pastillas de freno)" 
                  className="w-full border-2 border-slate-200 rounded-full py-2 pl-6 pr-12 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Acciones Derecha */}
            <div className="flex items-center gap-4 lg:gap-6">
              
              <button onClick={() => setIsLocationModalOpen(true)} className={`hidden lg:flex flex-col items-center justify-center cursor-pointer transition-colors ${userLocation ? 'text-primary' : 'text-slate-600 hover:text-primary'}`}>
                <MapPin className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-bold uppercase truncate max-w-[80px]">
                  {userLocation ? userLocation.comuna : 'Ubicación'}
                </span>
              </button>

              <button onClick={() => setIsVehicleModalOpen(true)} className={`hidden lg:flex flex-col items-center justify-center cursor-pointer transition-colors ${vehicle ? 'text-primary' : 'text-slate-600 hover:text-primary'}`}>
                <Car className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-bold uppercase truncate max-w-[80px]">
                  {vehicle ? vehicle.marca : 'Mi Vehículo'}
                </span>
              </button>

              {/* User / Login */}
              {user ? (
                <div className="relative group cursor-pointer hidden sm:flex flex-col items-center text-slate-600 hover:text-primary transition-colors">
                  <User className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] font-bold uppercase truncate max-w-[80px]">¡Hola, {user.name.split(' ')[0]}!</span>
                  
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                    <div className="py-1">
                      <Link to="/perfil" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Mi Cuenta</Link>
                      {user.role === 'admin' && (
                        <Link to="/admin" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-bold">Panel Admin</Link>
                      )}
                      <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50">Cerrar sesión</button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="hidden sm:flex flex-col items-center justify-center text-slate-600 hover:text-primary transition-colors">
                  <User className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] font-bold uppercase">Iniciar Sesión</span>
                </Link>
              )}

              <Link to="/favoritos" className="text-slate-600 hover:text-primary transition-colors relative hidden sm:flex flex-col items-center">
                <Heart className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-bold uppercase">Favoritos</span>
                {wishlist.ids.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
                    {wishlist.ids.length}
                  </span>
                )}
              </Link>

              <Link to="/checkout" className="text-slate-600 hover:text-primary transition-colors relative flex flex-col items-center">
                <ShoppingCart className="w-6 h-6 sm:w-5 sm:h-5 mb-0.5" />
                <span className="text-[10px] font-bold uppercase hidden sm:block">Carrito</span>
                {cartItemsCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} 
                    className="absolute -top-1 -right-2 bg-primary text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white"
                  >
                    {cartItemsCount}
                  </motion.span>
                )}
              </Link>

              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="sm:hidden p-2 text-slate-600">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Buscador Mobile */}
          <div className="md:hidden px-4 mt-3">
            <form onSubmit={handleSearch} className="w-full relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="¿Qué estás buscando?" 
                className="w-full border-2 border-slate-200 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-primary"
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400">
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Categorías Nav - Naranja */}
        <div className="bg-primary hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex">
            <Link to="/catalogo" className="flex items-center gap-2 bg-orange-700 text-white px-6 py-3 font-bold text-sm hover:bg-orange-800 transition-colors">
              <Menu className="w-5 h-5" />
              Todas las Categorías
            </Link>
            <div className="flex items-center space-x-1 pl-4">
              {['Neumáticos', 'Baterías', 'Lubricantes', 'Frenos', 'Accesorios'].map(cat => (
                <Link key={cat} to={`/catalogo?category=${cat}`} className="text-white/90 hover:text-white px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-1">
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="md:hidden overflow-hidden bg-white border-t border-slate-100">
              <div className="pt-2 pb-4 space-y-1 px-4">
                <Link to="/catalogo" className="block py-3 text-base font-bold text-slate-800 border-b border-slate-100">Catálogo Completo</Link>
                {['Neumáticos', 'Baterías', 'Lubricantes', 'Frenos'].map(cat => (
                  <Link key={cat} to={`/catalogo?category=${cat}`} className="block py-2 text-sm text-slate-600 pl-4">{cat}</Link>
                ))}
                
                {/* Opciones extra mobile */}
                <div className="my-2 border-t border-slate-100 pt-2"></div>
                <button onClick={() => { setIsMenuOpen(false); setIsLocationModalOpen(true); }} className="w-full text-left py-2 text-sm text-slate-600 pl-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Configurar Ubicación
                </button>
                <button onClick={() => { setIsMenuOpen(false); setIsVehicleModalOpen(true); }} className="w-full text-left py-2 text-sm text-slate-600 pl-4 flex items-center gap-2">
                  <Car className="w-4 h-4" /> Seleccionar Vehículo
                </button>

                <div className="my-2 border-t border-slate-100 pt-2"></div>
                {user ? (
                  <>
                    <Link to="/perfil" className="block py-2 text-sm font-medium text-slate-800">Mi Cuenta</Link>
                    <button onClick={logout} className="block w-full text-left py-2 text-sm text-red-600 font-medium">Cerrar Sesión</button>
                  </>
                ) : (
                  <Link to="/login" className="block py-2 text-sm font-medium text-primary">Iniciar Sesión</Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}

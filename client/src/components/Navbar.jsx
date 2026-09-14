import { Link } from 'react-router-dom';
import { ShoppingCart, Menu, User } from 'lucide-react';
import { useCartStore, useAuthStore, useConfigStore } from '../store/store';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { items } = useCartStore();
  const { user, logout } = useAuthStore();
  const { config } = useConfigStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const cartItemsCount = items.reduce((acc, item) => acc + item.qty, 0);

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <span className="text-2xl font-black text-primary tracking-tighter">
                {config?.logoText1 || 'AUTO'}<span className="text-slate-900">{config?.logoText2 || 'PRO'}</span>
              </span>
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link to="/catalogo" className="border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors">
                Catálogo
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-6">
            <Link to="/checkout" className="text-slate-500 hover:text-primary transition-colors relative">
              <ShoppingCart className="w-6 h-6" />
              {cartItemsCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
                >
                  {cartItemsCount}
                </motion.span>
              )}
            </Link>
            
            {user ? (
              <div className="relative group cursor-pointer">
                <div className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium">{user.name}</span>
                </div>
                <div className="absolute right-0 w-48 mt-2 origin-top-right bg-white border border-slate-200 divide-y divide-slate-100 rounded-md shadow-lg outline-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="py-1">
                    <Link to="/perfil" className="text-slate-700 flex justify-between w-full px-4 py-2 text-sm leading-5 text-left hover:bg-slate-100">
                      Mi Cuenta
                    </Link>
                    {user.role === 'admin' && (
                      <Link to="/admin" className="text-slate-700 flex justify-between w-full px-4 py-2 text-sm leading-5 text-left hover:bg-slate-100">
                        Panel Admin
                      </Link>
                    )}
                    <button onClick={logout} className="text-slate-700 flex justify-between w-full px-4 py-2 text-sm leading-5 text-left hover:bg-slate-100">
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" className="text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors">
                Ingresar
              </Link>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <Link to="/checkout" className="p-2 text-slate-400 hover:text-slate-500 relative mr-2">
              <ShoppingCart className="w-6 h-6" />
              {cartItemsCount > 0 && (
                <span className="absolute top-1 right-1 bg-primary text-white text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {cartItemsCount}
                </span>
              )}
            </Link>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:bg-slate-100 focus:text-slate-500 transition duration-150 ease-in-out">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            className="sm:hidden overflow-hidden"
          >
            <div className="pt-2 pb-3 space-y-1">
              <Link to="/catalogo" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-300">Catálogo</Link>
              {user ? (
                <>
                  <div className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-slate-800 bg-slate-50">{user.name}</div>
                  <Link to="/perfil" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50">Mi Cuenta</Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50">Panel Admin</Link>
                  )}
                  <button onClick={logout} className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50">Cerrar sesión</button>
                </>
              ) : (
                <Link to="/login" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50">Ingresar</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

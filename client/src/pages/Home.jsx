import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Shield, Wrench, Eye } from 'lucide-react';
import { useCartStore, useConfigStore, useRecentStore } from '../store/store';
import toast from 'react-hot-toast';

export default function Home() {
  const { config } = useConfigStore();
  const [featuredParts, setFeaturedParts] = useState([]);
  const [recentParts, setRecentParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const { addItem } = useCartStore();
  const recent = useRecentStore();

  useEffect(() => {
    document.title = 'Autopartes Pro — Repuestos y Autopartes de Calidad';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = 'Repuestos y autopartes de calidad para tu vehículo. Marcas líderes, compatibilidad verificada y despacho seguro a todo Chile.';
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const partsRes = await axios.get('/api/parts', { params: { page: 1, limit: 4 }, timeout: 10000 });
        setFeaturedParts(partsRes.data.items || partsRes.data);
        if (recent.ids.length) {
          const recentRes = await axios.get('/api/parts', { params: { ids: recent.ids.join(',') } });
          const arr = (d) => (Array.isArray(d) ? d : d.items || []);
          setRecentParts(recent.ids.map(id => arr(recentRes.data).find(p => String(p._id) === String(id))).filter(Boolean).slice(0, 4));
        }
      } catch (error) {
        console.error('Error fetching home data:', error);
        setCatalogError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const banners = (config?.banners || []).filter(b => b.active !== false);
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    if (banners.length > 1) {
      const timer = setInterval(() => setCurrentBanner(c => (c + 1) % banners.length), 5000);
      return () => clearInterval(timer);
    }
  }, [banners.length]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div>
      {/* Hero Section / Banners */}
      {banners.length > 0 ? (
        <section className="relative w-full h-[600px] overflow-hidden bg-slate-900">
          {banners.map((b, i) => (
            <div 
              key={i} 
              className={`absolute inset-0 transition-opacity duration-1000 ${i === currentBanner ? 'opacity-100' : 'opacity-0'}`}
            >
              <img src={b.imageUrl} alt={b.title || 'Banner'} className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-4">
                  {b.title && <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 drop-shadow-lg">{b.title}</h1>}
                  {b.link && (
                    <a href={b.link} className="inline-block bg-primary hover:bg-orange-600 text-white px-8 py-4 rounded-md font-bold text-lg transition-colors">
                      Ver Ofertas
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          {banners.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
              {banners.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentBanner(i)} 
                  className={`w-3 h-3 rounded-full transition-colors ${i === currentBanner ? 'bg-primary' : 'bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="relative bg-slate-900 text-white overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1920&q=80" 
              alt="Hero Background" 
              className="w-full h-full object-cover opacity-20"
            />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <p className="text-primary font-bold tracking-wide uppercase mb-2">
                {config?.heroEyebrow || 'Repuestos con respaldo profesional'}
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                {config?.heroTitle || 'Tu vehículo merece piezas que responden.'}
              </h1>
              <p className="text-xl text-slate-300 mb-8 max-w-xl">
                {config?.heroIntro || 'Encuentra repuestos de marcas líderes, con compatibilidad técnica verificada y despacho seguro.'}
              </p>
              <Link 
                to="/catalogo" 
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-md text-white bg-primary hover:bg-orange-600 transition-colors"
              >
                {config?.heroButton || 'Buscar repuestos'}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Categorías Rápidas / Quick Access */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex overflow-x-auto pb-4 hide-scrollbar gap-4 sm:gap-6 justify-start md:justify-center">
            {[
              { name: 'Neumáticos', icon: '🛞' },
              { name: 'Baterías', icon: '🔋' },
              { name: 'Lubricantes', icon: '🛢️' },
              { name: 'Frenos', icon: '🛑' },
              { name: 'Iluminación', icon: '💡' },
              { name: 'Accesorios', icon: '✨' },
            ].map(cat => (
              <Link key={cat.name} to={`/catalogo?category=${cat.name}`} className="flex flex-col items-center flex-shrink-0 group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full shadow-sm flex items-center justify-center text-2xl sm:text-3xl border border-slate-100 group-hover:border-primary group-hover:shadow-md transition-all">
                  {cat.icon}
                </div>
                <span className="mt-2 text-xs sm:text-sm font-medium text-slate-700 group-hover:text-primary text-center">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Productos Destacados
            </h2>
            <p className="text-sm md:text-base text-slate-500">
              Seleccionados por nuestros expertos
            </p>
          </div>
          <Link to="/catalogo" className="hidden sm:inline-flex items-center text-primary font-bold hover:underline">
            Ver todo <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {featuredParts.map((part) => (
            <motion.div 
              key={part._id} 
              whileHover={{ y: -5 }}
              className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden group flex flex-col hover:shadow-md transition-all"
            >
              <Link to={`/producto/${part._id}`} className="block relative aspect-square overflow-hidden bg-white p-4">
                <img 
                  src={part.image || 'https://images.unsplash.com/photo-1555617781-db47da4fef27?w=500&q=80'} 
                  alt={part.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                />
                {part.discountPercent > 0 && (
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 uppercase rounded-sm">
                    -{part.discountPercent}%
                  </div>
                )}
              </Link>
              <div className="p-4 flex flex-col flex-grow border-t border-slate-50">
                <div className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{part.brand}</div>
                <Link to={`/producto/${part._id}`} className="block mb-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                    {part.name}
                  </h3>
                </Link>
                
                {/* Estrellas simuladas */}
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-3 h-3 sm:w-4 sm:h-4 ${i < 4 ? 'text-yellow-400' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="text-[10px] text-slate-400 ml-1">(24)</span>
                </div>

                <div className="mt-auto">
                  <div className="mb-4">
                    {part.discountPercent > 0 && (
                      <div className="text-[10px] sm:text-xs text-slate-400 line-through">
                        Normal: ${part.price.toLocaleString('es-CL')}
                      </div>
                    )}
                    <div className="text-lg sm:text-xl font-black text-slate-900">
                      ${(part.price * (1 - (part.discountPercent || 0) / 100)).toLocaleString('es-CL')}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      addItem(part);
                      toast.success(`${part.name} agregado al carrito.`);
                    }}
                    disabled={part.stock < 1}
                    className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-2 sm:py-2.5 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm uppercase tracking-wide"
                  >
                    {part.stock > 0 ? 'Comprar ahora' : 'Sin stock'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {catalogError && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900">
            No pudimos cargar los productos destacados en este momento. Puedes intentar nuevamente desde el catálogo.
          </div>
        )}
        <div className="mt-6 text-center sm:hidden">
          <Link to="/catalogo" className="inline-block border border-slate-300 text-slate-700 font-bold py-2 px-6 rounded hover:bg-slate-50 transition-colors">
            Ver todo el catálogo
          </Link>
        </div>
      </section>

      {/* Trust Badges - Estilo Autoplanet */}
      <section className="bg-white border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-primary mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Garantía Total</h3>
              <p className="text-xs text-slate-500 mt-1">Cambios y devoluciones</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-primary mb-3">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Compra Segura</h3>
              <p className="text-xs text-slate-500 mt-1">Pagos 100% protegidos</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-primary mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900">Despacho Rápido</h3>
              <p className="text-xs text-slate-500 mt-1">A todo Chile</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-primary mb-3">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Soporte Técnico</h3>
              <p className="text-xs text-slate-500 mt-1">Asesoría especializada</p>
            </div>
          </div>
        </div>
      </section>

      {/* Vistos recientemente */}
      {recentParts.length > 0 && (
        <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> Vistos recientemente
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {recentParts.map((part) => (
              <motion.div
                key={part._id}
                whileHover={{ y: -5 }}
                className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden group flex flex-col hover:shadow-md transition-all"
              >
                <Link to={`/producto/${part._id}`} className="block relative aspect-square overflow-hidden bg-white p-4">
                  <img
                    src={part.image || 'https://images.unsplash.com/photo-1555617781-db47da4fef27?w=500&q=80'}
                    alt={part.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                </Link>
                <div className="p-4 flex flex-col flex-grow border-t border-slate-50">
                  <div className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{part.brand}</div>
                  <Link to={`/producto/${part._id}`} className="block mb-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                      {part.name}
                    </h3>
                  </Link>
                  <div className="mt-auto">
                    <div className="mb-4">
                      <div className="text-lg sm:text-xl font-black text-slate-900">
                        ${(part.price * (1 - (part.discountPercent || 0) / 100)).toLocaleString('es-CL')}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        addItem(part);
                        toast.success(`${part.name} agregado al carrito.`);
                      }}
                      disabled={part.stock < 1}
                      className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm uppercase tracking-wide"
                    >
                      {part.stock > 0 ? 'Comprar ahora' : 'Sin stock'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

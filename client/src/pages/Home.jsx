import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Shield, Wrench } from 'lucide-react';
import { useCartStore, useConfigStore } from '../store/store';
import toast from 'react-hot-toast';

export default function Home() {
  const { config } = useConfigStore();
  const [featuredParts, setFeaturedParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCartStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const partsRes = await axios.get('/api/parts?limit=4'); // Get some parts as featured
        setFeaturedParts(partsRes.data.items || partsRes.data);
      } catch (error) {
        console.error('Error fetching home data:', error);
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

      {/* Trust Badges */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div whileHover={{ y: -5 }} className="flex flex-col items-center text-center p-6 bg-slate-50 rounded-xl border border-slate-100">
              <Shield className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Compra protegida</h3>
              <p className="text-slate-500">Pago seguro con Mercado Pago</p>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="flex flex-col items-center text-center p-6 bg-slate-50 rounded-xl border border-slate-100">
              <CheckCircle className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Calidad garantizada</h3>
              <p className="text-slate-500">Marcas seleccionadas y verificadas</p>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="flex flex-col items-center text-center p-6 bg-slate-50 rounded-xl border border-slate-100">
              <Wrench className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Soporte experto</h3>
              <p className="text-slate-500">Te ayudamos a elegir la pieza correcta</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-bold text-primary tracking-widest uppercase mb-2">
            {config?.featuredEyebrow || 'SELECCIÓN DEL TALLER'}
          </p>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-4">
            {config?.featuredTitle || 'Productos destacados'}
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            {config?.featuredIntro || 'Los repuestos más buscados, seleccionados por calidad, disponibilidad y desempeño.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredParts.map((part) => (
            <motion.div 
              key={part._id} 
              whileHover={{ y: -10 }}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group flex flex-col"
            >
              <Link to={`/producto/${part._id}`} className="block relative aspect-square overflow-hidden bg-slate-100">
                <img 
                  src={part.image || 'https://images.unsplash.com/photo-1555617781-db47da4fef27?w=500&q=80'} 
                  alt={part.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {part.discountPercent > 0 && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    -{part.discountPercent}%
                  </div>
                )}
              </Link>
              <div className="p-5 flex flex-col flex-grow">
                <div className="text-xs text-slate-500 mb-1">{part.brand}</div>
                <Link to={`/producto/${part._id}`} className="block">
                  <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 hover:text-primary transition-colors">
                    {part.name}
                  </h3>
                </Link>
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xl font-black text-slate-900">
                      ${(part.price * (1 - (part.discountPercent || 0) / 100)).toLocaleString('es-CL')}
                    </span>
                    {part.discountPercent > 0 && (
                      <span className="text-sm text-slate-400 line-through">
                        ${part.price.toLocaleString('es-CL')}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      addItem(part);
                      toast.success(`${part.name} agregado al carrito.`);
                    }}
                    disabled={part.stock < 1}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {part.stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

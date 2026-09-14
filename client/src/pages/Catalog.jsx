import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useCartStore } from '../store/store';
import { motion } from 'framer-motion';
import { Filter, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Catalog() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCartStore();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || '';

  useEffect(() => {
    const fetchParts = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/parts', {
          params: { q: query, category, sort }
        });
        setParts(Array.isArray(res.data) ? res.data : res.data.items || []);
      } catch (error) {
        console.error('Error fetching parts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchParts();
  }, [query, category, sort]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = e.target.search.value;
    if (q) searchParams.set('q', q);
    else searchParams.delete('q');
    setSearchParams(searchParams);
  };

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    if (cat) searchParams.set('category', cat);
    else searchParams.delete('category');
    setSearchParams(searchParams);
  };

  const handleSortChange = (e) => {
    const s = e.target.value;
    if (s) searchParams.set('sort', s);
    else searchParams.delete('sort');
    setSearchParams(searchParams);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Catálogo de Repuestos</h1>
          <p className="text-slate-500 mt-2">Encuentra la pieza exacta para tu vehículo.</p>
        </div>
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="md:hidden flex items-center gap-2 bg-white border border-slate-300 px-4 py-2 rounded-md font-medium text-slate-700 shadow-sm"
        >
          <Filter className="w-4 h-4" /> Filtros
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <div className={`md:w-64 flex-shrink-0 ${isFilterOpen ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm sticky top-24">
            <div className="flex justify-between items-center mb-4 md:hidden">
              <h2 className="font-bold text-lg">Filtros</h2>
              <button onClick={() => setIsFilterOpen(false)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            
            <form onSubmit={handleSearch} className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Buscar</label>
              <div className="relative">
                <input 
                  type="text" 
                  name="search"
                  defaultValue={query}
                  placeholder="Ej: Filtro aceite" 
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-primary focus:border-primary sm:text-sm"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <button type="submit" className="mt-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium py-2 rounded-md text-sm transition-colors">
                Buscar
              </button>
            </form>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Categoría</label>
              <select 
                value={category}
                onChange={handleCategoryChange}
                className="w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="">Todas</option>
                <option value="Motor">Motor</option>
                <option value="Frenos">Frenos</option>
                <option value="Suspensión">Suspensión</option>
                <option value="Eléctrico">Eléctrico</option>
                <option value="Filtros">Filtros</option>
                <option value="Accesorios">Accesorios</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Ordenar por</label>
              <select 
                value={sort}
                onChange={handleSortChange}
                className="w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="">Más recientes</option>
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
                <option value="name">Nombre A-Z</option>
              </select>
            </div>
            
            {(query || category || sort) && (
              <button 
                onClick={() => setSearchParams({})}
                className="mt-6 w-full text-sm text-primary hover:text-orange-600 font-medium text-center"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-grow">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : parts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {parts.map((part) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={part._id} 
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
                  <div className="p-4 flex flex-col flex-grow">
                    <div className="text-xs text-slate-500 mb-1">{part.brand} | {part.category}</div>
                    <Link to={`/producto/${part._id}`} className="block">
                      <h3 className="text-base font-bold text-slate-900 mb-2 line-clamp-2 hover:text-primary transition-colors">
                        {part.name}
                      </h3>
                    </Link>
                    <div className="mt-auto pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-black text-slate-900">
                          ${(part.price * (1 - (part.discountPercent || 0) / 100)).toLocaleString('es-CL')}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          addItem(part);
                          toast.success(`${part.name} agregado al carrito.`);
                        }}
                        disabled={part.stock < 1}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 text-sm"
                      >
                        {part.stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No se encontraron repuestos</h3>
              <p className="text-slate-500 mt-1">Prueba ajustando los filtros de búsqueda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

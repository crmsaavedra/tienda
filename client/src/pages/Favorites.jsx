import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useCartStore, useWishlistStore, useRecentStore } from '../store/store';
import { motion } from 'framer-motion';
import { Heart, Trash2, Package, AlertTriangle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Favorites() {
  const wishlist = useWishlistStore();
  const recent = useRecentStore();
  const { addItem } = useCartStore();
  const [favoriteParts, setFavoriteParts] = useState([]);
  const [recentParts, setRecentParts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Mis Favoritos | Autopartes Pro';
  }, []);

  const loadParts = async () => {
    setLoading(true);
    try {
      const [favRes, recentRes] = await Promise.all([
        wishlist.ids.length ? axios.get('/api/parts', { params: { ids: wishlist.ids.join(',') } }) : Promise.resolve({ data: [] }),
        recent.ids.length ? axios.get('/api/parts', { params: { ids: recent.ids.join(',') } }) : Promise.resolve({ data: [] })
      ]);
      const arr = (d) => (Array.isArray(d) ? d : d.items || []);
      // conservar el orden de los ids guardados
      const orderBy = (items, ids) => ids.map(id => items.find(p => String(p._id) === String(id))).filter(Boolean);
      setFavoriteParts(orderBy(arr(favRes.data), wishlist.ids));
      setRecentParts(orderBy(arr(recentRes.data), recent.ids));
    } catch (error) {
      console.error('Error cargando favoritos', error);
      toast.error('Error al cargar tus favoritos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadParts(); }, [wishlist.ids.toString()]);

  const productCard = (part, isFavorite = false) => (
    <motion.div
      key={part._id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group flex flex-col"
    >
      <Link to={`/producto/${part._id}`} className="block relative aspect-square overflow-hidden bg-slate-100">
        <img
          src={part.image || 'https://images.unsplash.com/photo-1555617781-db47da4fef27?w=500&q=80'}
          alt={part.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {part.stock <= 0 && (
          <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Sin stock
          </div>
        )}
        {isFavorite && (
          <button
            onClick={() => { wishlist.remove(part._id); toast.success('Removido de favoritos'); }}
            aria-label="Quitar de favoritos"
            className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-full shadow-sm border border-slate-200 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-grow">
        <div className="text-xs text-slate-500 mb-1">{part.brand} | {part.category}</div>
        <Link to={`/producto/${part._id}`} className="block">
          <h3 className="text-base font-bold text-slate-900 mb-2 line-clamp-2 hover:text-primary transition-colors">{part.name}</h3>
        </Link>
        <div className="mt-auto pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-black text-slate-900">
              ${(part.price * (1 - (part.discountPercent || 0) / 100)).toLocaleString('es-CL')}
            </span>
          </div>
          <button
            onClick={() => { addItem(part); toast.success(`${part.name} agregado al carrito.`); }}
            disabled={part.stock < 1}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 text-sm"
          >
            {part.stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
          <Heart className="w-8 h-8 fill-red-500 text-red-500" /> Mis Favoritos
        </h1>
        <p className="text-slate-500 mt-2">Guarda repuestos que te interesan y encuéntralos aquí.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : favoriteParts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteParts.map(p => productCard(p, true))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
          <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Aún no tienes favoritos</h3>
          <p className="text-slate-500 mt-1 mb-6">Toca el botón de corazón en cualquier producto para guardarlo aquí.</p>
          <Link to="/catalogo" className="inline-block bg-primary hover:bg-orange-600 text-white font-bold px-6 py-2 rounded-md transition-colors">
            Explorar catálogo
          </Link>
        </div>
      )}

      {recentParts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary" /> Vistos recientemente
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentParts.map(p => productCard(p))}
          </div>
        </section>
      )}
    </div>
  );
}
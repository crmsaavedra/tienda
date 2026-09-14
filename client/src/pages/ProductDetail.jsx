import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useCartStore, useAuthStore } from '../store/store';
import { ChevronRight, Package, Tag, Info, AlertTriangle, CheckCircle, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams();
  const [part, setPart] = useState(null);
  const [relatedParts, setRelatedParts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const { addItem } = useCartStore();
  const { token, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('specs');

  useEffect(() => {
    const fetchPart = async () => {
      try {
        const res = await axios.get(`/api/parts/${id}`);
        setPart(res.data);
        
        // Fetch related products
        const relatedRes = await axios.get('/api/parts', {
          params: { category: res.data.category, limit: 5 }
        });
        const items = Array.isArray(relatedRes.data) ? relatedRes.data : relatedRes.data.items || [];
        setRelatedParts(items.filter(p => p._id !== id).slice(0, 4));

        // Fetch reviews
        const reviewsRes = await axios.get(`/api/reviews/part/${id}`);
        setReviews(reviewsRes.data);
        
      } catch (error) {
        console.error('Error fetching part:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPart();
  }, [id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!token) return toast.error('Debes iniciar sesión para comentar');
    try {
      await axios.post('/api/reviews', { partId: id, ...newReview }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Reseña enviada para moderación');
      setNewReview({ rating: 5, comment: '' });
    } catch (err) {
      toast.error('Error al enviar la reseña');
    }
  };

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  if (!part) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Producto no encontrado</h2>
      <Link to="/catalogo" className="text-primary hover:underline">Volver al catálogo</Link>
    </div>
  );

  const finalPrice = part.discountPercent > 0 
    ? Math.round(part.price * (1 - part.discountPercent / 100)) 
    : part.price;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <nav className="flex text-sm text-slate-500 mb-8" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/" className="hover:text-slate-900">Inicio</Link>
          </li>
          <li><div className="flex items-center"><ChevronRight className="w-4 h-4 mx-1" /></div></li>
          <li>
            <Link to={`/catalogo?category=${part.category}`} className="hover:text-slate-900">{part.category}</Link>
          </li>
          <li><div className="flex items-center"><ChevronRight className="w-4 h-4 mx-1" /></div></li>
          <li aria-current="page" className="text-slate-800 font-medium truncate max-w-[200px] sm:max-w-xs">{part.name}</li>
        </ol>
      </nav>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 xl:gap-x-12">
          {/* Product Images */}
          <div className="flex flex-col p-8 bg-slate-50 items-center justify-center relative">
             {part.discountPercent > 0 && (
                <div className="absolute top-6 right-6 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full z-10 shadow-sm">
                  -{part.discountPercent}% OFF
                </div>
              )}
            <motion.img 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              src={part.image || 'https://images.unsplash.com/photo-1555617781-db47da4fef27?w=800&q=80'} 
              alt={part.name}
              className="w-full max-w-md object-contain rounded-lg drop-shadow-xl mix-blend-multiply"
            />
          </div>

          {/* Product Info */}
          <div className="p-8 sm:p-10 lg:pl-0">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-primary tracking-wider uppercase">{part.brand}</span>
              <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">SKU: {part.sku}</span>
            </div>
            
            <h1 className="text-3xl font-extrabold text-slate-900 mb-6">{part.name}</h1>
            
            <div className="flex items-end gap-4 mb-6">
              <span className="text-4xl font-black text-slate-900">
                ${finalPrice.toLocaleString('es-CL')}
              </span>
              {part.discountPercent > 0 && (
                <span className="text-xl text-slate-400 line-through mb-1">
                  ${part.price.toLocaleString('es-CL')}
                </span>
              )}
            </div>

            <p className="text-slate-600 mb-8 leading-relaxed">
              {part.description}
            </p>

            <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex flex-col">
                <label className="text-xs text-slate-500 font-medium uppercase mb-1">Cantidad</label>
                <div className="flex items-center border border-slate-300 rounded-md bg-white">
                  <button 
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="px-3 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                  >-</button>
                  <span className="px-4 py-2 font-medium border-x border-slate-200 min-w-[3rem] text-center">{qty}</span>
                  <button 
                    onClick={() => setQty(Math.min(part.stock, qty + 1))}
                    className="px-3 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                  >+</button>
                </div>
              </div>
              <div className="flex-grow">
                <button 
                  onClick={() => {
                    addItem(part, qty);
                    toast.success(`${qty} x ${part.name} agregado al carrito.`);
                  }}
                  disabled={part.stock < 1}
                  className="w-full h-[62px] mt-5 bg-primary hover:bg-orange-600 text-white text-lg font-bold rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
                >
                  <Package className="w-5 h-5" />
                  {part.stock > 0 ? 'Agregar al Carrito' : 'Agotado'}
                </button>
              </div>
            </div>

            {part.stock > 0 ? (
              <p className="text-sm text-green-600 flex items-center font-medium">
                <CheckCircle className="w-4 h-4 mr-1.5" /> En stock ({part.stock} disponibles)
              </p>
            ) : (
              <p className="text-sm text-red-500 flex items-center font-medium">
                <AlertTriangle className="w-4 h-4 mr-1.5" /> Sin stock temporalmente
              </p>
            )}
          </div>
        </div>

        {/* Tabs for extra info */}
        <div className="border-t border-slate-200 bg-white">
          <div className="flex border-b border-slate-200">
            <button 
              onClick={() => setActiveTab('specs')}
              className={`px-8 py-4 text-sm font-bold uppercase tracking-wider ${activeTab === 'specs' ? 'text-primary border-b-2 border-primary bg-orange-50/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              Especificaciones
            </button>
            <button 
              onClick={() => setActiveTab('compat')}
              className={`px-8 py-4 text-sm font-bold uppercase tracking-wider ${activeTab === 'compat' ? 'text-primary border-b-2 border-primary bg-orange-50/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              Compatibilidad
            </button>
            <button 
              onClick={() => setActiveTab('reviews')}
              className={`px-8 py-4 text-sm font-bold uppercase tracking-wider ${activeTab === 'reviews' ? 'text-primary border-b-2 border-primary bg-orange-50/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              Reseñas ({reviews.length})
            </button>
          </div>
          <div className="p-8">
            {activeTab === 'specs' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {part.technicalSpecs && part.technicalSpecs.length > 0 ? (
                  part.technicalSpecs.map((spec, idx) => (
                    <div key={idx} className="flex justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700">{spec.label}</span>
                      <span className="text-slate-600 text-right">{spec.value}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic">No hay especificaciones técnicas detalladas para este producto.</p>
                )}
              </div>
            )}
            {activeTab === 'compat' && (
              <div className="overflow-x-auto">
                {part.compatibility && part.compatibility.length > 0 ? (
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Marca</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Modelo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Año</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Motor</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {part.compatibility.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{c.make}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{c.model}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{c.yearFrom} - {c.yearTo || 'Presente'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{c.engine || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-slate-500 italic">No hay información de compatibilidad registrada.</p>
                )}
              </div>
            )}
            {activeTab === 'reviews' && (
              <div className="space-y-8">
                {reviews.length > 0 ? (
                  <ul className="space-y-6">
                    {reviews.map(r => (
                      <li key={r._id} className="border-b border-slate-100 pb-6 last:border-0">
                        <div className="flex items-center gap-2 mb-2 text-yellow-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-5 h-5 ${i < r.rating ? 'fill-current' : 'text-slate-200'}`} />
                          ))}
                        </div>
                        <p className="text-slate-700 italic mb-2">"{r.comment}"</p>
                        <p className="text-sm font-bold text-slate-500">- {r.user?.email.split('@')[0]} ({new Date(r.createdAt).toLocaleDateString()})</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 italic">Aún no hay reseñas para este producto.</p>
                )}

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Dejar una reseña</h3>
                  {token ? (
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Puntuación</label>
                        <div className="flex gap-2">
                          {[1,2,3,4,5].map(v => (
                            <button type="button" key={v} onClick={() => setNewReview({...newReview, rating: v})} className="focus:outline-none">
                              <Star className={`w-8 h-8 ${v <= newReview.rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Comentario</label>
                        <textarea required value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary" rows="4" placeholder="¿Qué te pareció este producto?"></textarea>
                      </div>
                      <button type="submit" className="bg-primary hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-bold transition-colors">Enviar Reseña</button>
                    </form>
                  ) : (
                    <p className="text-slate-600">
                      Debes <Link to="/login" className="text-primary font-bold hover:underline">iniciar sesión</Link> para dejar una reseña.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Productos Relacionados */}
      {relatedParts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Productos Relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedParts.map((relPart) => (
              <Link to={`/producto/${relPart._id}`} key={relPart._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className="h-48 bg-slate-50 flex items-center justify-center p-4">
                  <img src={relPart.image || `https://picsum.photos/seed/${relPart._id}/300/300`} alt={relPart.name} className="max-h-full mix-blend-multiply" />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">{relPart.brand}</p>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2 mb-2">{relPart.name}</h3>
                  </div>
                  <p className="font-black text-slate-900 text-lg">${relPart.price.toLocaleString('es-CL')}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

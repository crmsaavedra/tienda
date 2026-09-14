import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/store';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Package, Download, User as UserIcon, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Profile() {
  const { user, token, logout } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get('/api/orders/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(res.data);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchOrders();
  }, [user, token]);

  const handleDownloadInvoice = async (orderId) => {
    try {
      const response = await axios.get(`/api/orders/${orderId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Boleta-${orderId.slice(-6)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading invoice:', err);
      alert('Error al descargar la boleta. Asegúrate de que el pedido esté pagado.');
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold">Debes iniciar sesión</h2>
        <Link to="/login" className="text-primary hover:underline mt-4 inline-block">Ir a Login</Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-[80vh] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar / Info */}
          <div className="w-full md:w-1/3 lg:w-1/4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-24">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-orange-100 text-primary rounded-full flex items-center justify-center">
                  <UserIcon size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-slate-500 font-medium">RUT</p>
                  <p className="text-slate-900">{user.rut || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Teléfono</p>
                  <p className="text-slate-900">{user.phone || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Dirección</p>
                  <p className="text-slate-900">{user.address || 'No especificada'}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button onClick={logout} className="flex items-center text-red-600 hover:text-red-700 font-medium w-full transition-colors">
                  <LogOut size={18} className="mr-2" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>

          {/* Orders History */}
          <div className="w-full md:w-2/3 lg:w-3/4">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Mis Pedidos</h1>
            
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Aún no tienes pedidos</h3>
                <p className="text-slate-500 mb-6">Explora nuestro catálogo y encuentra lo que necesitas.</p>
                <Link to="/catalogo" className="inline-flex items-center px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-orange-600 transition-colors">
                  Ir al catálogo
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map(order => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={order._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Pedido #{order._id.slice(-6)}</p>
                        <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString('es-CL')} - {new Date(order.createdAt).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'paid' ? 'bg-green-100 text-green-800' : order.status === 'delivered' ? 'bg-emerald-600 text-white' : order.status === 'cancelled' || order.status === 'refunded' ? 'bg-red-100 text-red-800' : order.status === 'dispatched' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {order.status === 'paid' ? 'PAGADO' : order.status === 'delivered' ? 'ENTREGADO' : order.status === 'dispatched' ? 'DESPACHADO' : order.status === 'cancelled' ? 'CANCELADO' : order.status === 'refunded' ? 'REEMBOLSADO' : 'PENDIENTE'}
                        </span>
                        {(order.status === 'paid' || order.status === 'dispatched' || order.status === 'delivered') && (
                          <button onClick={() => handleDownloadInvoice(order._id)} className="text-primary hover:text-orange-700 flex items-center text-sm font-medium transition-colors bg-orange-50 px-3 py-1 rounded-full border border-orange-200 hover:bg-orange-100">
                            <Download size={14} className="mr-1" /> Boleta
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 mb-3">Artículos</h4>
                          <ul className="space-y-2 text-sm text-slate-600">
                            {order.items.map((item, i) => (
                              <li key={i} className="flex justify-between">
                                <span>{item.qty}x {item.name}</span>
                                <span className="font-medium text-slate-900">${(item.unitPrice * item.qty).toLocaleString('es-CL')}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between font-bold text-slate-900">
                            <span>Total Pagado</span>
                            <span>${order.total.toLocaleString('es-CL')}</span>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                          <h4 className="text-sm font-bold text-slate-900 mb-3">Información de Envío</h4>
                          <p className="text-sm text-slate-600 mb-1">
                            <span className="font-medium text-slate-700">Método:</span> {order.deliveryMethod === 'pickup' ? 'Retiro en Tienda' : 'Envío a Domicilio'}
                          </p>
                          {order.deliveryMethod === 'delivery' && (
                            <p className="text-sm text-slate-600 mb-3">
                              <span className="font-medium text-slate-700">Dirección:</span> {order.customerInfo.address}
                            </p>
                          )}
                          <div className="mt-2">
                            <span className="text-sm font-medium text-slate-700">Seguimiento:</span>
                            {order.trackingNumber ? (
                              <div className="mt-1 p-2 bg-white border border-slate-200 rounded text-center text-sm font-mono text-slate-800 font-bold">
                                {order.trackingNumber}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-500 italic ml-2">Aún no asignado</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

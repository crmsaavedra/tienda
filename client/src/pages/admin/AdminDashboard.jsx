import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore, useConfigStore } from '../../store/store';
import { Package, TrendingUp, AlertTriangle, Settings, Tag, Truck, Edit, Plus, Trash2, Users, Eye, MessageSquare, Shield, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [data, setData] = useState({ sales: { revenue: 0, count: 0 }, lowStock: [], orders: [] });
  const [parts, setParts] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [trackingNumbers, setTrackingNumbers] = useState({});
  const [siteConfig, setSiteConfig] = useState(null);
  const [newDiscount, setNewDiscount] = useState({
    code: '', type: 'percent', value: 0, minimumAmount: 0, endAt: new Date(Date.now() + 86400000*30).toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'dashboard') {
          const res = await axios.get('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });
          setData(res.data);
        } else if (activeTab === 'orders') {
          const res = await axios.get('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } });
          setData(prev => ({ ...prev, orders: res.data }));
        } else if (activeTab === 'parts') {
          const res = await axios.get('/api/admin/parts', { headers: { Authorization: `Bearer ${token}` } });
          setParts(res.data);
        } else if (activeTab === 'discounts') {
          const res = await axios.get('/api/admin/discounts', { headers: { Authorization: `Bearer ${token}` } });
          setDiscounts(res.data);
        } else if (activeTab === 'customers') {
          const res = await axios.get('/api/admin/customers', { headers: { Authorization: `Bearer ${token}` } });
          setCustomers(res.data);
        } else if (activeTab === 'reviews') {
          const res = await axios.get('/api/admin/reviews', { headers: { Authorization: `Bearer ${token}` } });
          setReviews(res.data);
        } else if (activeTab === 'config' || activeTab === 'advanced') {
          const res = await axios.get('/api/admin/site-config', { headers: { Authorization: `Bearer ${token}` } });
          setSiteConfig(res.data);
        }
      } catch (error) {
        console.error('Error fetching admin data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, activeTab]);

  const handleExportCSV = async (type) => {
    try {
      const res = await axios.get(`/api/admin/export/${type}`, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Error al exportar');
    }
  };

  const handleDeletePart = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este repuesto?')) return;
    try {
      await axios.delete(`/api/admin/parts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setParts(parts.filter(p => p._id !== id));
      toast.success('Repuesto eliminado');
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const handleDeleteDiscount = async (id) => {
    if (!window.confirm('¿Eliminar descuento?')) return;
    try {
      await axios.delete(`/api/admin/discounts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setDiscounts(discounts.filter(d => d._id !== id));
      toast.success('Descuento eliminado');
    } catch (err) {
      toast.error('Error al eliminar descuento');
    }
  };

  const handleCreateDiscount = async (e) => {
    e.preventDefault();
    if (!newDiscount.code || !newDiscount.value || !newDiscount.endAt) return toast.error('Faltan campos');
    try {
      const res = await axios.post('/api/admin/discounts', newDiscount, { headers: { Authorization: `Bearer ${token}` } });
      setDiscounts([res.data, ...discounts]);
      setNewDiscount({ code: '', type: 'percent', value: 0, minimumAmount: 0, endAt: new Date(Date.now() + 86400000*30).toISOString().split('T')[0] });
      toast.success('Descuento creado');
    } catch (err) {
      toast.error('Error al crear descuento');
    }
  };

  const handleSaveConfig = async () => {
    try {
      const res = await axios.put('/api/admin/site-config', siteConfig, { headers: { Authorization: `Bearer ${token}` } });
      setSiteConfig(res.data);
      useConfigStore.getState().setConfig(res.data);
      toast.success('Configuración guardada correctamente');
      document.documentElement.style.setProperty('--color-primary', res.data.primaryColor);
    } catch (err) {
      toast.error('Error al guardar configuración');
    }
  };

  const handleUpdateTracking = async (orderId) => {
    const trackingNumber = trackingNumbers[orderId];
    if (!trackingNumber) return toast.error('Ingresa un número de seguimiento');
    
    try {
      await axios.put(`/api/admin/orders/${orderId}/tracking`, { trackingNumber }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Número de seguimiento actualizado y correo enviado');
      
      // Update local state
      setData({
        ...data,
        orders: data.orders.map(o => o._id === orderId ? { ...o, trackingNumber } : o)
      });
    } catch (err) {
      toast.error('Error al actualizar seguimiento');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-start gap-8 min-h-[calc(100vh-4rem)]">
      {/* Sidebar Placeholder */}
      <div className="w-64 flex-shrink-0 hidden md:block">
        {/* Sidebar Fijo */}
        <div className="fixed top-24 w-64 h-[calc(100vh-7rem)] overflow-y-auto rounded-xl bg-slate-900 text-white shadow-xl p-4">
          <h2 className="text-xl font-black mb-6 px-4">Panel Admin</h2>
          <nav className="space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <TrendingUp className="w-5 h-5" /> Resumen
            </button>
            <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <Truck className="w-5 h-5" /> Órdenes & Despachos
            </button>
            <button onClick={() => setActiveTab('parts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'parts' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <Package className="w-5 h-5" /> Repuestos
            </button>
            <button onClick={() => setActiveTab('discounts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'discounts' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <Tag className="w-5 h-5" /> Descuentos
            </button>
            <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'customers' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <Users className="w-5 h-5" /> Clientes
            </button>
            <button onClick={() => setActiveTab('reviews')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'reviews' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <MessageSquare className="w-5 h-5" /> Reseñas
            </button>
            <button onClick={() => setActiveTab('config')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'config' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <Settings className="w-5 h-5" /> Diseño y Textos
            </button>
            <button onClick={() => setActiveTab('advanced')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'advanced' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <Shield className="w-5 h-5" /> Config Avanzada
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
              {loading ? (
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="p-4 bg-green-100 text-green-600 rounded-xl">
                        <TrendingUp className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Ventas Totales</p>
                        <p className="text-2xl font-black text-slate-900">${(data.sales?.revenue || 0).toLocaleString('es-CL')}</p>
                        <p className="text-xs text-green-600">{data.sales?.count || 0} pedidos pagados</p>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="p-4 bg-orange-100 text-orange-600 rounded-xl">
                        <Truck className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Por Despachar</p>
                        <p className="text-2xl font-black text-slate-900">{data.metrics?.pendingOrders || 0}</p>
                        <p className="text-xs text-orange-600">Órdenes pendientes</p>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="p-4 bg-red-100 text-red-600 rounded-xl">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Stock Crítico</p>
                        <p className="text-2xl font-black text-slate-900">{data.lowStock?.length || 0}</p>
                        <p className="text-xs text-red-600">Productos por agotarse</p>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
                        <Users className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Clientes</p>
                        <p className="text-2xl font-black text-slate-900">{data.metrics?.users || 0}</p>
                        <p className="text-xs text-blue-600">Usuarios registrados</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Últimas órdenes */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <h2 className="text-lg font-bold text-slate-900">Últimas Órdenes</h2>
                        <button onClick={() => setActiveTab('orders')} className="text-sm text-primary font-medium hover:underline">Ver todas</button>
                      </div>
                      <div className="p-0">
                        <ul className="divide-y divide-slate-100">
                          {data.orders?.slice(0, 5).map(order => (
                            <li key={order._id} className="p-4 hover:bg-slate-50 flex justify-between items-center transition-colors">
                              <div>
                                <p className="font-bold text-slate-900">#{order._id.toString().slice(-6)} <span className="text-xs font-normal text-slate-500 ml-2">{new Date(order.createdAt).toLocaleDateString()}</span></p>
                                <p className="text-sm text-slate-600">{order.customerInfo?.name || 'Cliente'} • {order.items?.length || 0} productos</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className="font-black text-slate-900">${(order.total || 0).toLocaleString('es-CL')}</span>
                                <Link to={`/admin/ordenes/${order._id}`} className="flex items-center text-xs text-primary font-medium hover:text-orange-600">
                                  <Eye className="w-3 h-3 mr-1" /> Ver detalles
                                </Link>
                              </div>
                            </li>
                          ))}
                          {!data.orders?.length && <li className="p-6 text-center text-slate-500">No hay órdenes recientes</li>}
                        </ul>
                      </div>
                    </div>

                    {/* Stock Crítico (Detalle) */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" /> Repuestos por Agotarse
                        </h2>
                        <button onClick={() => setActiveTab('parts')} className="text-sm text-primary font-medium hover:underline">Ir a Repuestos</button>
                      </div>
                      <div className="p-0">
                        <ul className="divide-y divide-slate-100">
                          {data.lowStock?.slice(0, 5).map(part => (
                            <li key={part._id} className="p-4 hover:bg-slate-50 flex gap-4 items-center transition-colors">
                              <img src={part.image || 'https://via.placeholder.com/40'} alt={part.name} className="w-12 h-12 rounded object-cover border border-slate-200" />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 truncate">{part.name}</p>
                                <p className="text-sm text-slate-500">{part.brand} • SKU: {part.sku}</p>
                              </div>
                              <div className="text-center">
                                <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold ${part.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {part.stock} disp.
                                </span>
                              </div>
                            </li>
                          ))}
                          {!data.lowStock?.length && <li className="p-6 text-center text-slate-500">Todo el inventario está en niveles óptimos</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">Órdenes y Despachos</h1>
                <button onClick={() => handleExportCSV('orders')} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors">
                  <Download className="w-4 h-4" /> Exportar CSV
                </button>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Pedido / Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Método</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Seguimiento</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {data.orders.map(o => (
                        <tr key={o._id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-900">#{o._id.substring(o._id.length - 6)}</p>
                            <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-900">{o.customerInfo?.name}</p>
                            <p className="text-xs text-slate-500">{o.customerInfo?.email}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-900">
                            {o.deliveryMethod === 'pickup' ? <span className="text-blue-600 font-medium">Retiro en Tienda</span> : 'Envío a Domicilio'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${o.status === 'paid' ? 'bg-green-100 text-green-800' : o.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Link to={`/admin/ordenes/${o._id}`} className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded text-xs font-bold transition-colors">
                              Ver Detalle
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'parts' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">Gestión de Repuestos</h1>
                <div className="flex gap-4">
                  <button onClick={() => handleExportCSV('parts')} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors">
                    <Download className="w-4 h-4" /> Exportar CSV
                  </button>
                  <Link to="/admin/productos/nuevo" className="bg-primary hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                    <Plus className="w-5 h-5" /> Nuevo Repuesto
                  </Link>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Precio</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {parts.map(p => (
                        <tr key={p._id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <img src={p.image || 'https://via.placeholder.com/50'} alt={p.name} className="w-10 h-10 rounded object-cover" />
                            <div>
                              <p className="text-sm font-bold text-slate-900 line-clamp-1">{p.name}</p>
                              <p className="text-xs text-slate-500">{p.category}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-mono">{p.sku}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-900">${p.price.toLocaleString('es-CL')}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.stock > p.lowStockThreshold ? 'bg-green-100 text-green-800' : p.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {p.stock}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <Link to={`/admin/productos/${p._id}`} className="text-blue-600 hover:text-blue-900 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button onClick={() => handleDeletePart(p._id)} className="text-red-600 hover:text-red-900 p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'discounts' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-slate-900">Gestión de Descuentos</h1>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Crear Nuevo Descuento</h2>
                <form onSubmit={handleCreateDiscount} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Código</label>
                    <input type="text" value={newDiscount.code} onChange={e => setNewDiscount({...newDiscount, code: e.target.value.toUpperCase()})} placeholder="EJ: OFERTA20" className="w-full p-2 border border-slate-300 rounded focus:ring-primary uppercase" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                    <select value={newDiscount.type} onChange={e => setNewDiscount({...newDiscount, type: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary">
                      <option value="percent">Porcentaje (%)</option>
                      <option value="fixed">Monto Fijo ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Valor</label>
                    <input type="number" value={newDiscount.value} onChange={e => setNewDiscount({...newDiscount, value: Number(e.target.value)})} min="1" className="w-full p-2 border border-slate-300 rounded focus:ring-primary" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Válido Hasta</label>
                    <input type="date" value={newDiscount.endAt} onChange={e => setNewDiscount({...newDiscount, endAt: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" required />
                  </div>
                  <div>
                    <button type="submit" className="w-full bg-primary hover:bg-orange-600 text-white p-2 rounded font-bold transition-colors">
                      Crear
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Código</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Beneficio</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Vencimiento</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {discounts.map(d => (
                      <tr key={d._id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">{d.code}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {d.type === 'percent' ? `${d.value}% dto.` : `$${d.value.toLocaleString('es-CL')} dto.`}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(d.endAt).toLocaleDateString()}
                          {new Date(d.endAt) < new Date() && <span className="ml-2 text-xs text-red-500 font-bold">(Vencido)</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteDiscount(d._id)} className="text-red-600 hover:text-red-900 p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {discounts.length === 0 && (
                      <tr><td colSpan="4" className="px-6 py-4 text-center text-slate-500 text-sm">No hay descuentos creados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">Clientes Registrados</h1>
                <button onClick={() => handleExportCSV('customers')} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors">
                  <Download className="w-4 h-4" /> Exportar CSV
                </button>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Cliente</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Pedidos</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Total Gastado</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Fecha Registro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {customers.map(c => (
                      <tr key={c._id}>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{c.name}</p>
                          <p className="text-sm text-slate-500">{c.email}</p>
                        </td>
                        <td className="px-6 py-4 font-medium">{c.ordersCount}</td>
                        <td className="px-6 py-4 font-black text-green-600">${c.totalSpent.toLocaleString('es-CL')}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-slate-900">Moderación de Reseñas</h1>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <ul className="divide-y divide-slate-200">
                  {reviews.map(r => (
                    <li key={r._id} className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-bold text-slate-900">{r.user?.email || 'Usuario'}</p>
                          <p className="text-sm text-slate-500">Producto: {r.part?.name}</p>
                        </div>
                        <div className="flex gap-2">
                          {r.status === 'pending' && (
                            <>
                              <button onClick={async () => {
                                await axios.put(`/api/admin/reviews/${r._id}/status`, { status: 'approved' }, { headers: { Authorization: `Bearer ${token}` } });
                                setReviews(reviews.map(x => x._id === r._id ? { ...x, status: 'approved' } : x));
                                toast.success('Aprobada');
                              }} className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-sm font-bold hover:bg-green-200">Aprobar</button>
                              <button onClick={async () => {
                                await axios.put(`/api/admin/reviews/${r._id}/status`, { status: 'rejected' }, { headers: { Authorization: `Bearer ${token}` } });
                                setReviews(reviews.map(x => x._id === r._id ? { ...x, status: 'rejected' } : x));
                                toast.error('Rechazada');
                              }} className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-sm font-bold hover:bg-red-200">Rechazar</button>
                            </>
                          )}
                          {r.status !== 'pending' && (
                            <span className={`px-3 py-1 rounded-md text-sm font-bold ${r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {r.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex text-yellow-400 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg key={i} className={`w-5 h-5 ${i < r.rating ? 'fill-current' : 'text-slate-300'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        ))}
                      </div>
                      <p className="text-slate-700">{r.comment}</p>
                    </li>
                  ))}
                  {reviews.length === 0 && <li className="p-6 text-center text-slate-500">No hay reseñas para mostrar</li>}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'config' && siteConfig && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">Diseño y Textos</h1>
                <button onClick={handleSaveConfig} className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors">
                  Guardar Cambios
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Formulario */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Identidad (Logo)</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Texto Principal</label>
                        <input type="text" value={siteConfig.logoText1 || ''} onChange={e => setSiteConfig({...siteConfig, logoText1: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary font-black" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Texto Secundario</label>
                        <input type="text" value={siteConfig.logoText2 || ''} onChange={e => setSiteConfig({...siteConfig, logoText2: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary font-black" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Color Principal de la Tienda</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={siteConfig.primaryColor || '#ea580c'} onChange={e => setSiteConfig({...siteConfig, primaryColor: e.target.value})} className="h-10 w-20 rounded cursor-pointer" />
                        <span className="font-mono text-sm text-slate-500">{siteConfig.primaryColor || '#ea580c'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Textos del Hero (Inicio)</h2>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Pequeño antetítulo</label>
                      <input type="text" value={siteConfig.heroEyebrow || ''} onChange={e => setSiteConfig({...siteConfig, heroEyebrow: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Título Principal</label>
                      <input type="text" value={siteConfig.heroTitle || ''} onChange={e => setSiteConfig({...siteConfig, heroTitle: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary font-bold text-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Texto Introductorio</label>
                      <textarea value={siteConfig.heroIntro || ''} onChange={e => setSiteConfig({...siteConfig, heroIntro: e.target.value})} rows="3" className="w-full p-2 border border-slate-300 rounded focus:ring-primary"></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Texto del Botón</label>
                      <input type="text" value={siteConfig.heroButton || ''} onChange={e => setSiteConfig({...siteConfig, heroButton: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Footer & Contacto</h2>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Descripción corta</label>
                      <textarea value={siteConfig.footerDescription || ''} onChange={e => setSiteConfig({...siteConfig, footerDescription: e.target.value})} rows="2" className="w-full p-2 border border-slate-300 rounded focus:ring-primary"></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Dirección</label>
                        <input type="text" value={siteConfig.contactAddress || ''} onChange={e => setSiteConfig({...siteConfig, contactAddress: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label>
                        <input type="text" value={siteConfig.contactPhone || ''} onChange={e => setSiteConfig({...siteConfig, contactPhone: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                        <input type="email" value={siteConfig.contactEmail || ''} onChange={e => setSiteConfig({...siteConfig, contactEmail: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Redes Sociales (URLs)</h2>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Facebook</label>
                        <input type="text" placeholder="https://facebook.com/tu-pagina" value={siteConfig.socialFacebook || ''} onChange={e => setSiteConfig({...siteConfig, socialFacebook: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Instagram</label>
                        <input type="text" placeholder="https://instagram.com/tu-pagina" value={siteConfig.socialInstagram || ''} onChange={e => setSiteConfig({...siteConfig, socialInstagram: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Twitter / X</label>
                        <input type="text" placeholder="https://twitter.com/tu-pagina" value={siteConfig.socialTwitter || ''} onChange={e => setSiteConfig({...siteConfig, socialTwitter: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Banners del Carrusel (Inicio)</h2>
                    <p className="text-sm text-slate-500">Agrega imágenes promocionales para mostrar en la página principal.</p>
                    <div className="space-y-4">
                      {(siteConfig.banners || []).map((b, i) => (
                        <div key={i} className="p-4 border border-slate-200 rounded-lg flex flex-col gap-2 relative">
                          <button onClick={() => {
                            const newB = [...siteConfig.banners];
                            newB.splice(i, 1);
                            setSiteConfig({...siteConfig, banners: newB});
                          }} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><Trash2 className="w-5 h-5"/></button>
                          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <input type="checkbox" checked={b.active !== false} onChange={e => {
                              const newB = [...siteConfig.banners];
                              newB[i].active = e.target.checked;
                              setSiteConfig({...siteConfig, banners: newB});
                            }} /> Activo
                          </label>
                          <input type="text" placeholder="URL de la imagen (Ej: https://...)" value={b.imageUrl || ''} onChange={e => {
                            const newB = [...siteConfig.banners];
                            newB[i].imageUrl = e.target.value;
                            setSiteConfig({...siteConfig, banners: newB});
                          }} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                          <input type="text" placeholder="Título (Opcional)" value={b.title || ''} onChange={e => {
                            const newB = [...siteConfig.banners];
                            newB[i].title = e.target.value;
                            setSiteConfig({...siteConfig, banners: newB});
                          }} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                          <input type="text" placeholder="Enlace de destino (Opcional)" value={b.link || ''} onChange={e => {
                            const newB = [...siteConfig.banners];
                            newB[i].link = e.target.value;
                            setSiteConfig({...siteConfig, banners: newB});
                          }} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                        </div>
                      ))}
                      <button onClick={() => {
                        setSiteConfig({...siteConfig, banners: [...(siteConfig.banners || []), {imageUrl: '', title: '', link: '', active: true}]});
                      }} className="w-full py-2 border-2 border-dashed border-primary text-primary font-bold rounded-lg hover:bg-orange-50">+ Agregar Banner</button>
                    </div>
                  </div>
                </div>

                {/* Previsualización en iframe */}
                <div className="bg-slate-200 rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800 relative h-fit sticky top-24">
                  <div className="bg-slate-800 text-slate-400 text-xs py-2 px-4 flex gap-2 items-center justify-between">
                    <div className="flex gap-2 items-center">
                      <div className="flex gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div><div className="w-3 h-3 rounded-full bg-yellow-500"></div><div className="w-3 h-3 rounded-full bg-green-500"></div></div>
                      <span className="ml-2">Previsualización del Sitio</span>
                    </div>
                    <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-white">Guarda para actualizar</span>
                  </div>
                  {/* We use a key based on siteConfig.updatedAt so the iframe reloads when saved */}
                  <iframe 
                    key={siteConfig.updatedAt || 'preview'} 
                    src="/" 
                    title="Site Preview" 
                    className="w-full h-[700px] border-none bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && siteConfig && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">Configuración Avanzada</h1>
                <button onClick={handleSaveConfig} className="bg-primary hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                  <Settings className="w-5 h-5" /> Guardar Credenciales
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h2 className="text-lg font-bold text-slate-900 border-b pb-2 flex items-center gap-2"><Shield className="w-5 h-5 text-red-500"/> Correos Electrónicos (SMTP)</h2>
                  <p className="text-sm text-slate-500">Configura tu servidor de correo para enviar confirmaciones automáticas de envío a los clientes.</p>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Host SMTP</label>
                    <input type="text" placeholder="smtp.gmail.com" value={siteConfig.credentials?.smtpHost || ''} onChange={e => setSiteConfig({...siteConfig, credentials: {...siteConfig.credentials, smtpHost: e.target.value}})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Puerto SMTP</label>
                      <input type="number" placeholder="465" value={siteConfig.credentials?.smtpPort || 465} onChange={e => setSiteConfig({...siteConfig, credentials: {...siteConfig.credentials, smtpPort: parseInt(e.target.value)}})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Usuario (Email)</label>
                      <input type="email" placeholder="ventas@tutienda.com" value={siteConfig.credentials?.smtpUser || ''} onChange={e => setSiteConfig({...siteConfig, credentials: {...siteConfig.credentials, smtpUser: e.target.value}})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña (App Password)</label>
                    <input type="password" placeholder="********" value={siteConfig.credentials?.smtpPass || ''} onChange={e => setSiteConfig({...siteConfig, credentials: {...siteConfig.credentials, smtpPass: e.target.value}})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Integración Mercado Pago</h2>
                  <p className="text-sm text-slate-500">Token de acceso para procesar pagos (Reemplaza a la variable de entorno).</p>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Access Token</label>
                    <input type="password" placeholder="APP_USR-..." value={siteConfig.credentials?.mpAccessToken || ''} onChange={e => setSiteConfig({...siteConfig, credentials: {...siteConfig.credentials, mpAccessToken: e.target.value}})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                  </div>
                  
                  <h2 className="text-lg font-bold text-slate-900 border-b pb-2 mt-8">Reglas de Envío</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Umbral para Envío Gratis ($)</label>
                      <input type="number" value={siteConfig.freeShippingThreshold || 0} onChange={e => setSiteConfig({...siteConfig, freeShippingThreshold: parseInt(e.target.value)})} className="w-full p-2 border border-slate-300 rounded focus:ring-primary" />
                    </div>
                    
                    <label className="block text-sm font-bold text-slate-700">Costos por Región</label>
                    {(siteConfig.shippingRules || []).map((rule, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input type="text" value={rule.region} onChange={e => {
                          const newRules = [...siteConfig.shippingRules];
                          newRules[idx].region = e.target.value;
                          setSiteConfig({...siteConfig, shippingRules: newRules});
                        }} className="flex-1 p-2 border border-slate-300 rounded focus:ring-primary" placeholder="Región" />
                        <input type="number" value={rule.cost} onChange={e => {
                          const newRules = [...siteConfig.shippingRules];
                          newRules[idx].cost = parseInt(e.target.value);
                          setSiteConfig({...siteConfig, shippingRules: newRules});
                        }} className="w-32 p-2 border border-slate-300 rounded focus:ring-primary" placeholder="Costo" />
                        <button onClick={() => {
                          const newRules = siteConfig.shippingRules.filter((_, i) => i !== idx);
                          setSiteConfig({...siteConfig, shippingRules: newRules});
                        }} className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"><Trash2 className="w-5 h-5"/></button>
                      </div>
                    ))}
                    <button onClick={() => {
                      setSiteConfig({...siteConfig, shippingRules: [...(siteConfig.shippingRules || []), {region: '', cost: 0}]});
                    }} className="text-sm text-primary font-bold hover:underline">+ Añadir otra región</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

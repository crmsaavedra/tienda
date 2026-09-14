import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../store/store';
import { ArrowLeft, Save, Truck, User, CreditCard, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`/api/admin/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setOrder(res.data);
        setLoading(false);
      })
      .catch(err => {
        toast.error('Error al cargar la orden');
        navigate('/admin');
      });
  }, [id, token, navigate]);

  const handleSave = async () => {
    setSaving(true);
    const loadToast = toast.loading('Guardando...');
    try {
      // Guardar tracking si aplica
      if (order.deliveryMethod === 'delivery' && order.status === 'paid') {
        await axios.put(`/api/admin/orders/${id}/tracking`, { trackingNumber: order.trackingNumber }, { headers: { Authorization: `Bearer ${token}` } });
      }
      
      // Guardar estado general (esto podría ser en un endpoint separado o el mismo)
      await axios.put(`/api/admin/orders/${id}/status`, { status: order.status }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success('Cambios guardados correctamente', { id: loadToast });
    } catch (err) {
      toast.error('Error al guardar', { id: loadToast });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;

  if (!order) return <div className="p-8 text-center">Orden no encontrada</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Orden #{order._id?.toString().slice(-6)}</h1>
            <p className="text-sm text-slate-500">{order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda (Info y Productos) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 font-bold text-lg mb-4 border-b pb-2 text-slate-800">
              <Package className="w-5 h-5 text-primary" /> Productos ({order.items?.length || 0})
            </div>
            <div className="space-y-4">
              {order.items?.map((item, i) => (
                <div key={item.part || i} className="flex gap-4 items-center">
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 line-clamp-1">{item.name}</p>
                    <p className="text-sm text-slate-500">Cantidad: {item.quantity} x ${item.price?.toLocaleString('es-CL')}</p>
                  </div>
                  <div className="font-bold text-slate-900">
                    ${((item.quantity || 0) * (item.price || 0)).toLocaleString('es-CL')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 font-bold text-lg mb-2 text-slate-800">
                <User className="w-5 h-5 text-primary" /> Cliente
              </div>
              <p className="text-slate-900 font-medium">{order.customerInfo?.name || 'Sin nombre'}</p>
              <p className="text-slate-600 text-sm">{order.customerInfo?.email || 'Sin correo'}</p>
              <p className="text-slate-600 text-sm">{order.customerInfo?.phone || 'Sin teléfono'}</p>
              <p className="text-slate-600 text-sm mt-2">{order.customerInfo?.rut || 'Sin RUT'}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 font-bold text-lg mb-2 text-slate-800">
                <Truck className="w-5 h-5 text-primary" /> Entrega
              </div>
              <p className="text-slate-900 font-medium">{order.deliveryMethod === 'pickup' ? 'Retiro en Tienda' : 'Despacho a Domicilio'}</p>
              {order.deliveryMethod === 'delivery' && (
                <>
                  <p className="text-slate-600 text-sm">{order.customerInfo?.address?.street} {order.customerInfo?.address?.number}</p>
                  <p className="text-slate-600 text-sm">{order.customerInfo?.address?.city}, {order.customerInfo?.address?.region}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha (Estados y Pago) */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold mb-4 border-b border-slate-700 pb-2">Estado del Pedido</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Estado General</label>
                <select value={order.status || 'pending'} onChange={(e) => setOrder({...order, status: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-primary focus:ring-1 focus:ring-primary">
                  <option value="pending">Pendiente</option>
                  <option value="paid">Pagado</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="refunded">Reembolsado</option>
                </select>
              </div>
              
              {order.deliveryMethod === 'delivery' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Nº de Seguimiento (Tracking)</label>
                  <input 
                    type="text" 
                    value={order.trackingNumber || ''} 
                    onChange={(e) => setOrder({...order, trackingNumber: e.target.value})} 
                    placeholder="Ingresa código (ej: BLX12345)"
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-primary focus:ring-1 focus:ring-primary placeholder-slate-500"
                  />
                  {order.trackingNumber && <p className="text-xs text-green-400 mt-1">✓ Correo enviado al cliente</p>}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 font-bold text-lg mb-4 border-b pb-2 text-slate-800">
              <CreditCard className="w-5 h-5 text-primary" /> Resumen de Pago
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>${(order.subtotal || 0).toLocaleString('es-CL')}</span>
              </div>
              {order.discount?.amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento ({order.discount.code})</span>
                  <span>-${order.discount.amount?.toLocaleString('es-CL')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-slate-900 pt-2 border-t">
                <span>Total</span>
                <span>${(order.total || 0).toLocaleString('es-CL')}</span>
              </div>
            </div>
            {order.status === 'paid' && (
              <a href={`/api/orders/${order._id}/invoice`} target="_blank" rel="noreferrer" className="mt-4 block w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 rounded transition-colors">
                Ver Boleta PDF
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

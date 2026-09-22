import { useState } from 'react';
import { Package, Search, CheckCircle, Clock, Truck } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Seguimiento() {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;

    setLoading(true);
    setError('');
    setOrderData(null);

    try {
      // Intentamos buscar la orden en el API
      const res = await axios.get(`/api/orders/track/${orderId.trim()}`);
      setOrderData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se encontró ninguna orden con ese número.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status) => {
    switch(status) {
      case 'pending': return { text: 'Pendiente de Pago', icon: Clock, color: 'text-amber-500' };
      case 'paid': return { text: 'Pagado - Preparando', icon: CheckCircle, color: 'text-green-500' };
      case 'dispatched': return { text: 'Despachado', icon: Truck, color: 'text-blue-500' };
      case 'delivered': return { text: 'Entregado', icon: CheckCircle, color: 'text-emerald-600' };
      default: return { text: status, icon: Package, color: 'text-slate-500' };
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 w-full">
      <div className="text-center mb-10">
        <Package className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Seguimiento de Pedidos</h1>
        <p className="text-slate-500">Ingresa el ID de tu orden para ver el estado de tu despacho.</p>
      </div>

      <form onSubmit={handleSearch} className="max-w-md mx-auto flex gap-2 mb-12">
        <input 
          type="text" 
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="ID de Orden (ej. 60d5ec...)" 
          className="flex-1 border-2 border-slate-200 rounded-md py-3 px-4 focus:border-primary outline-none transition-colors" 
          required
        />
        <button 
          type="submit" 
          disabled={loading || !orderId}
          className="bg-primary hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? 'Buscando...' : <><Search className="w-5 h-5"/> Buscar</>}
        </button>
      </form>

      {error && (
        <div className="max-w-md mx-auto bg-red-50 text-red-600 p-4 rounded-md text-center font-medium border border-red-200">
          {error}
        </div>
      )}

      {orderData && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Orden #{orderData.orderNumber || orderData._id.slice(-6).toUpperCase()}</h2>
              <p className="text-sm text-slate-500">Realizada el {new Date(orderData.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-700">Total pagado</p>
              <p className="text-xl font-bold text-primary">${orderData.total?.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="p-6 bg-slate-50">
            <h3 className="font-bold text-slate-700 mb-4">Estado del Pedido</h3>
            
            {(() => {
              const statusInfo = getStatusDisplay(orderData.status);
              const StatusIcon = statusInfo.icon;
              return (
                <div className={`flex items-center gap-4 p-4 rounded-lg bg-white border border-slate-200`}>
                  <div className={`p-3 rounded-full bg-slate-50 ${statusInfo.color}`}>
                    <StatusIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <p className={`font-bold text-lg ${statusInfo.color}`}>{statusInfo.text}</p>
                    <p className="text-sm text-slate-500">
                      {orderData.trackingNumber ? `N° Seguimiento: ${orderData.trackingNumber}` : 'Tu orden está siendo procesada en bodega.'}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
          
          <div className="p-6">
            <h3 className="font-bold text-slate-700 mb-4">Detalle de Productos</h3>
            <div className="divide-y divide-slate-100">
              {orderData.items?.map((item, i) => (
                <div key={i} className="py-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">{item.qty}x</span>
                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">${(item.unitPrice * item.qty).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

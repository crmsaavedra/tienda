import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore, useAuthStore, useConfigStore } from '../store/store';
import axios from 'axios';
import { Trash2, ShoppingBag, CreditCard, ChevronRight, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Checkout() {
  const { items, removeItem, updateItemQty, clearCart, getCartTotal } = useCartStore();
  const { user, token } = useAuthStore();
  const { config } = useConfigStore();
  const navigate = useNavigate();
  
  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('delivery');
  const [region, setRegion] = useState('');

  const displayedSubtotal = quote?.subtotal ?? getCartTotal();
  const discountAmount = quote?.discount?.amount || 0;
  
  let shippingCost = 0;
  if (deliveryMethod === 'delivery' && region) {
    const rule = config?.shippingRules?.find(r => r.region === region);
    if (rule) {
      if (config?.freeShippingThreshold > 0 && displayedSubtotal >= config.freeShippingThreshold) {
        shippingCost = 0;
      } else {
        shippingCost = rule.cost;
      }
    }
  }

  const displayedTotal = displayedSubtotal - discountAmount + shippingCost;
  
  const [customerInfo, setCustomerInfo] = useState({
    name: user?.name || '',
    email: user?.email || '',
    rut: user?.rut || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });

  const fetchQuote = async (code = appliedDiscount) => {
    if (items.length === 0) return setQuote(null);
    setLoadingQuote(true);
    setError('');
    try {
      const payload = {
        items: items.map(i => ({ partId: i.partId, qty: i.qty })),
        discountCode: code
      };
      const res = await axios.post('/api/orders/quote', payload);
      setQuote(res.data);
      if (code && res.data.discount) {
        setAppliedDiscount(code);
      } else if (code) {
        setError('Cupón inválido o no aplicable.');
        setAppliedDiscount('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al calcular el total.');
    } finally {
      setLoadingQuote(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [items]);

  const handleApplyDiscount = (e) => {
    e.preventDefault();
    fetchQuote(discountCode);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');
    try {
      const payload = {
        items: items.map(i => ({ partId: i.partId, qty: i.qty })),
        discountCode: appliedDiscount,
        customerInfo: { ...customerInfo, region: deliveryMethod === 'delivery' ? region : '' },
        deliveryMethod
      };
      const headers = useAuthStore.getState().token
        ? { Authorization: `Bearer ${useAuthStore.getState().token}` }
        : undefined;
      const res = await axios.post('/api/orders/checkout', payload, { headers });
      
      // Webpay requiere un POST con token_ws
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = res.data.checkoutUrl;
      
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'token_ws';
      input.value = res.data.token;
      
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar el pago.');
      setIsProcessing(false);
    }
  };

  const handleInfoChange = (e) => {
    setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-slate-100 mb-6">
          <ShoppingBag className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Tu carrito está vacío</h2>
        <p className="text-slate-500 mb-8">Parece que aún no has agregado ningún repuesto a tu carrito.</p>
        <Link to="/catalogo" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-orange-600 transition-colors">
          Explorar catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Finalizar Compra</h1>
        
        {error && (
          <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-md">
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
          {/* Cart Items & Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-bold text-slate-900">Resumen del pedido</h2>
              </div>
              <ul className="divide-y divide-slate-200">
                {items.map((item) => {
                  const itemPrice = item.discountPercent > 0 
                    ? Math.round(item.price * (1 - item.discountPercent / 100)) 
                    : item.price;
                    
                  return (
                    <motion.li layout key={item.partId} className="p-6 flex items-center">
                      <img src={item.image || `https://picsum.photos/seed/${item.partId}/150/150`} alt={item.name} className="w-20 h-20 object-cover rounded-md bg-slate-100" />
                      <div className="ml-6 flex-1">
                        <div className="flex justify-between">
                          <h4 className="text-base font-bold text-slate-900 line-clamp-1"><Link to={`/producto/${item.partId}`}>{item.name}</Link></h4>
                          <p className="text-lg font-black text-slate-900 ml-4">${(itemPrice * item.qty).toLocaleString('es-CL')}</p>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{item.brand} | SKU: {item.sku}</p>
                        <div className="mt-4 flex justify-between items-center">
                          <div className="flex items-center border border-slate-300 rounded-md">
                            <button onClick={() => updateItemQty(item.partId, Math.max(1, item.qty - 1))} className="px-2 py-1 text-slate-500 hover:text-slate-900">-</button>
                            <span className="px-3 py-1 font-medium text-sm border-x border-slate-200">{item.qty}</span>
                            <button onClick={() => updateItemQty(item.partId, Math.min(item.stock, item.qty + 1))} className="px-2 py-1 text-slate-500 hover:text-slate-900">+</button>
                          </div>
                          <button onClick={() => removeItem(item.partId)} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center">
                            <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>

            {(
              <form id="checkout-form" onSubmit={handleCheckout} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-lg font-bold text-slate-900">Método de entrega</h2>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200">
                  <label className={`border rounded-lg p-4 cursor-pointer flex items-center transition-colors ${deliveryMethod === 'delivery' ? 'border-primary bg-orange-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="deliveryMethod" value="delivery" checked={deliveryMethod === 'delivery'} onChange={(e) => setDeliveryMethod(e.target.value)} className="mr-3 text-primary focus:ring-primary h-4 w-4" />
                    <div>
                      <span className="block font-bold text-slate-900">Envío a Domicilio</span>
                      <span className="block text-sm text-slate-500 mt-1">Recibe tus repuestos en casa</span>
                    </div>
                  </label>
                  <label className={`border rounded-lg p-4 cursor-pointer flex items-center transition-colors ${deliveryMethod === 'pickup' ? 'border-primary bg-orange-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="deliveryMethod" value="pickup" checked={deliveryMethod === 'pickup'} onChange={(e) => setDeliveryMethod(e.target.value)} className="mr-3 text-primary focus:ring-primary h-4 w-4" />
                    <div>
                      <span className="block font-bold text-slate-900">Retiro en Tienda</span>
                      <span className="block text-sm text-slate-500 mt-1">Retira sin costo adicional</span>
                    </div>
                  </label>
                </div>

                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-lg font-bold text-slate-900">Datos del comprador</h2>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
                    <input type="text" required name="name" value={customerInfo.name} onChange={handleInfoChange} className="w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">RUT</label>
                    <input type="text" required name="rut" value={customerInfo.rut} onChange={handleInfoChange} placeholder="Ej: 12.345.678-9" className="w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" required name="email" value={customerInfo.email} onChange={handleInfoChange} className="w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                    <input type="text" required name="phone" value={customerInfo.phone} onChange={handleInfoChange} className="w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {deliveryMethod === 'delivery' ? 'Región' : 'Región (opcional)'}
                    </label>
                    <select required={deliveryMethod === 'delivery'} value={region} onChange={(e) => setRegion(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm">
                      <option value="">Selecciona tu región</option>
                      {(config?.shippingRules || []).map((r, idx) => (
                        <option key={idx} value={r.region}>{r.region}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {deliveryMethod === 'delivery' ? 'Dirección de envío' : 'Dirección (opcional)'}
                    </label>
                    <input type="text" required={deliveryMethod === 'delivery'} name="address" value={customerInfo.address} onChange={handleInfoChange} className="w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" placeholder={deliveryMethod === 'pickup' ? 'Opcional para retiro en tienda' : 'Av. Ejemplo 123, Santiago'} />
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-5 mt-8 lg:mt-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 sticky top-24">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-bold text-slate-900">Total a pagar</h2>
              </div>
              <div className="p-6">
                <form onSubmit={handleApplyDiscount} className="flex gap-2 mb-6">
                  <input 
                    type="text" 
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Código de descuento" 
                    className="flex-1 border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm uppercase"
                  />
                  <button type="submit" disabled={!discountCode || loadingQuote} className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
                    Aplicar
                  </button>
                </form>

                <div className="space-y-4 text-sm text-slate-600 mb-6">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-900">${displayedSubtotal.toLocaleString('es-CL')}</span>
                  </div>
                  {quote?.discount && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento ({quote.discount.code})</span>
                      <span className="font-medium">-${quote.discount.amount.toLocaleString('es-CL')}</span>
                    </div>
                  )}
                  {deliveryMethod === 'delivery' && (
                    <div className="flex justify-between text-slate-600">
                      <span>Envío ({region || 'Selecciona región'})</span>
                      <span className="font-medium">{shippingCost > 0 ? `$${shippingCost.toLocaleString('es-CL')}` : 'Gratis'}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-4 border-t border-slate-200 text-lg font-black text-slate-900">
                    <span>Total</span>
                    <span>${displayedTotal.toLocaleString('es-CL')}</span>
                  </div>
                </div>

                <button 
                  type="submit"
                  form="checkout-form"
                  disabled={!user || isProcessing || loadingQuote}
                  className="w-full bg-slate-900 hover:bg-slate-700 text-white font-bold py-4 px-4 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                     <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Pagar con Webpay Plus (Transbank)
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-500 text-center mt-4 flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" /> Serás redirigido a Transbank para completar el pago seguro
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

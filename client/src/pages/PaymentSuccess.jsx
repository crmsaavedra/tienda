import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCartStore } from '../store/store';
import { CheckCircle2 } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const { clearCart } = useCartStore();

  useEffect(() => {
    // Solo vaciamos el carrito cuando el pago fue efectivamente exitoso
    clearCart();
  }, [clearCart]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-slate-200">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">¡Pago Exitoso!</h2>
        <p className="text-slate-600 mb-8 text-lg">
          Tu orden <strong className="text-slate-900">#{orderId?.slice(-6).toUpperCase()}</strong> ha sido procesada correctamente y el stock ha sido reservado.
        </p>
        <div className="flex flex-col gap-4">
          <Link
            to="/perfil"
            className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm"
          >
            Ver mis pedidos
          </Link>
          <Link
            to="/catalogo"
            className="w-full inline-flex justify-center items-center px-4 py-3 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm"
          >
            Volver al catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}

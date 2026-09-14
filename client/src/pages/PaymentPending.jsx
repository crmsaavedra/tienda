import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';

export default function PaymentPending() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-slate-200">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-yellow-100 p-3">
            <Clock className="w-16 h-16 text-yellow-600" />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Pago Pendiente</h2>
        <p className="text-slate-600 mb-8 text-lg">
          Estamos esperando la confirmación de tu banco. Tus productos siguen en tu carrito por ahora hasta que se confirme la transacción.
        </p>
        <div className="flex flex-col gap-4">
          <Link
            to="/perfil"
            className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 shadow-sm"
          >
            Ver estado en mi perfil
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

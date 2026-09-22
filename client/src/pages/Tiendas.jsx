import { useState, useEffect } from 'react';
import { MapPin, Phone, Clock } from 'lucide-react';
import axios from 'axios';

export default function Tiendas() {
  const [tiendas, setTiendas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/stores').then(res => {
      setTiendas(res.data);
      setLoading(false);
    }).catch(() => {
      // Fallback
      setTiendas([
        { nombre: 'Sucursal Santiago Centro (Demo)', direccion: 'Av. Portugal 123', horario: 'Lunes a Viernes 09:00 - 18:30', telefono: '+56 2 2123 4567' }
      ]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <MapPin className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Nuestras Tiendas</h1>
        <p className="text-slate-500">Encuentra tu sucursal Autopartes Pro más cercana. Tenemos stock disponible para entrega inmediata.</p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Cargando sucursales">
          {[1, 2, 3].map(item => <div key={item} className="h-64 rounded-xl bg-slate-200 animate-pulse" />)}
        </div>
      ) : tiendas.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiendas.map((tienda, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">{tienda.nombre}</h2>
            <div className="space-y-3 text-sm text-slate-600">
              <p className="flex items-start gap-2"><MapPin className="w-5 h-5 text-primary shrink-0" /> {tienda.direccion}</p>
              <p className="flex items-start gap-2"><Clock className="w-5 h-5 text-primary shrink-0" /> {tienda.horario}</p>
              <p className="flex items-start gap-2"><Phone className="w-5 h-5 text-primary shrink-0" /> {tienda.telefono}</p>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tienda.lat != null && tienda.lng != null ? `${tienda.lat},${tienda.lng}` : tienda.direccion)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 block w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 rounded-md transition-colors text-center"
            >
              Ver en Mapa
            </a>
          </div>
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-2xl rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-xl font-bold text-slate-800">Estamos actualizando nuestras sucursales</h2>
          <p className="mt-2 text-slate-500">Pronto publicaremos los puntos de retiro disponibles. Mientras tanto, nuestro equipo puede ayudarte a coordinar tu compra.</p>
          <a href="tel:+56912345678" className="mt-5 inline-flex rounded-md bg-primary px-5 py-3 font-bold text-white hover:bg-orange-600">Llamar a soporte</a>
        </div>
      )}
    </div>
  );
}

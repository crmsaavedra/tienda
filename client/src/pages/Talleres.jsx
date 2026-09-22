import { useState, useEffect } from 'react';
import { Wrench, Star, Phone, MapPin } from 'lucide-react';
import axios from 'axios';

export default function Talleres() {
  const [talleres, setTalleres] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/workshops').then(res => {
      setTalleres(res.data);
      setLoading(false);
    }).catch(() => {
      setTalleres([
        { nombre: 'Taller Demo', direccion: 'Demo', rating: 5, telefono: '123' }
      ]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <Wrench className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Talleres Registrados</h1>
        <p className="text-slate-500">Encuentra mecánicos expertos recomendados por nosotros para instalar tus repuestos.</p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Cargando talleres">
          {[1, 2, 3].map(item => <div key={item} className="h-56 rounded-xl bg-slate-200 animate-pulse" />)}
        </div>
      ) : talleres.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {talleres.map((taller, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-slate-800">{taller.nombre}</h2>
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm font-bold">{taller.rating}</span>
              </div>
            </div>
            <div className="space-y-3 text-sm text-slate-600 border-t border-slate-100 pt-4">
              <p className="flex items-start gap-2"><MapPin className="w-5 h-5 text-primary shrink-0" /> {taller.direccion}</p>
              <p className="flex items-start gap-2"><Phone className="w-5 h-5 text-primary shrink-0" /> {taller.telefono}</p>
            </div>
            <a href={`tel:${String(taller.telefono || '').replace(/\s/g, '')}`} className="mt-6 block w-full bg-primary hover:bg-orange-600 text-white font-bold py-2 rounded-md transition-colors text-center">
              Contactar Taller
            </a>
          </div>
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-2xl rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-xl font-bold text-slate-800">Aún no hay talleres asociados en esta zona</h2>
          <p className="mt-2 text-slate-500">Estamos ampliando nuestra red de instaladores recomendados. Contáctanos para recibir orientación técnica.</p>
          <a href="tel:+56912345678" className="mt-5 inline-flex rounded-md bg-primary px-5 py-3 font-bold text-white hover:bg-orange-600">Hablar con un asesor</a>
        </div>
      )}
    </div>
  );
}

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';

export default function NotFound() {
  useEffect(() => { document.title = 'Página no encontrada | Autopartes Pro'; }, []);
  return (
    <section className="flex flex-1 items-center justify-center px-4 py-20 text-center">
      <div className="max-w-lg">
        <SearchX className="mx-auto h-16 w-16 text-primary" />
        <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-primary">Error 404</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">No encontramos esta página</h1>
        <p className="mt-3 text-slate-600">Es posible que el enlace haya cambiado o que el repuesto ya no esté disponible.</p>
        <Link to="/catalogo" className="mt-7 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-bold text-white transition-colors hover:bg-orange-600">
          <ArrowLeft className="h-4 w-4" /> Ir al catálogo
        </Link>
      </div>
    </section>
  );
}

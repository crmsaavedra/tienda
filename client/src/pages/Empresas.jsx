import { useState } from 'react';
import { Building, Send, CheckCircle, Briefcase, Truck, Percent } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Empresas() {
  const [formData, setFormData] = useState({
    rut: '',
    razonSocial: '',
    giro: '',
    contacto: '',
    email: '',
    telefono: '',
    mensaje: ''
  });
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/b2b-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Error al enviar la solicitud');
      setEnviado(true);
      toast.success('Solicitud enviada exitosamente.');
    } catch (err) {
      toast.error('Ocurrió un error al enviar tu solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 w-full">
      <div className="text-center mb-12">
        <Building className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Venta Empresas (B2B)</h1>
        <p className="text-slate-500 max-w-2xl mx-auto text-lg">
          Únete a nuestra red de clientes corporativos y accede a beneficios exclusivos para tu flota, taller o negocio de repuestos.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 items-start">
        {/* Beneficios */}
        <div className="space-y-8">
          <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Beneficios de Cuenta Empresa</h2>
            
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="bg-white p-3 rounded-xl shadow-sm text-primary shrink-0"><Percent className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Descuentos por Volumen</h3>
                  <p className="text-slate-600">Accede a precios mayoristas y escalas de descuento progresivas según tu nivel de compra mensual.</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="bg-white p-3 rounded-xl shadow-sm text-primary shrink-0"><Briefcase className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Atención Personalizada</h3>
                  <p className="text-slate-600">Ejecutivo de cuentas asignado para gestionar tus cotizaciones, resolver dudas técnicas y agilizar tus pedidos.</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="bg-white p-3 rounded-xl shadow-sm text-primary shrink-0"><Truck className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Despacho Prioritario</h3>
                  <p className="text-slate-600">Envíos rápidos a todo Chile con prioridad en la preparación y entrega directo a tu taller o sucursal.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          {enviado ? (
            <div className="text-center py-12 flex flex-col items-center">
              <CheckCircle className="w-20 h-20 text-green-500 mb-4" />
              <h3 className="text-2xl font-bold text-slate-800 mb-2">¡Solicitud Enviada!</h3>
              <p className="text-slate-600 mb-6">Hemos recibido los datos de tu empresa. Un ejecutivo comercial se pondrá en contacto contigo dentro de las próximas 24 horas hábiles.</p>
              <button 
                onClick={() => setEnviado(false)} 
                className="text-primary font-bold hover:underline"
              >
                Enviar otra solicitud
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Solicita tu Cuenta</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">RUT Empresa *</label>
                    <input type="text" name="rut" value={formData.rut} onChange={handleChange} required placeholder="Ej: 76.123.456-7" className="w-full border-2 border-slate-200 rounded-md py-2.5 px-3 focus:border-primary outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Razón Social *</label>
                    <input type="text" name="razonSocial" value={formData.razonSocial} onChange={handleChange} required placeholder="Nombre de la empresa" className="w-full border-2 border-slate-200 rounded-md py-2.5 px-3 focus:border-primary outline-none transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Giro Comercial</label>
                  <input type="text" name="giro" value={formData.giro} onChange={handleChange} placeholder="Ej: Taller Mecánico, Venta de Repuestos" className="w-full border-2 border-slate-200 rounded-md py-2.5 px-3 focus:border-primary outline-none transition-colors" />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de Contacto *</label>
                    <input type="text" name="contacto" value={formData.contacto} onChange={handleChange} required className="w-full border-2 border-slate-200 rounded-md py-2.5 px-3 focus:border-primary outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono *</label>
                    <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} required placeholder="+56 9 1234 5678" className="w-full border-2 border-slate-200 rounded-md py-2.5 px-3 focus:border-primary outline-none transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full border-2 border-slate-200 rounded-md py-2.5 px-3 focus:border-primary outline-none transition-colors" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Cuéntanos sobre tus necesidades</label>
                  <textarea name="mensaje" value={formData.mensaje} onChange={handleChange} rows="3" placeholder="Volumen de compra estimado, tipos de repuestos que buscas..." className="w-full border-2 border-slate-200 rounded-md py-2.5 px-3 focus:border-primary outline-none transition-colors resize-none"></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2 text-lg"
                >
                  {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : <><Send className="w-5 h-5"/> Enviar Solicitud</>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

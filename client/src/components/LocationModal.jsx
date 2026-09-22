import { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocationStore } from '../store/store';
import toast from 'react-hot-toast';
import { regionesChile } from '../utils/chileData';

export default function LocationModal({ isOpen, onClose }) {
  const [region, setRegion] = useState('');
  const [comuna, setComuna] = useState('');
  const { setLocation } = useLocationStore();

  if (!isOpen) return null;

  const handleRegionChange = (e) => {
    setRegion(e.target.value);
    setComuna(''); // Reset comuna when region changes
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!region || !comuna) return;
    
    setLocation({ region, comuna });
    toast.success('Ubicación actualizada para calcular despacho y stock.');
    onClose();
  };

  const selectedRegionData = regionesChile.find(r => r.region === region);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="text-primary w-6 h-6" /> Selecciona tu ubicación
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col gap-4">
            <p className="text-sm text-slate-500 mb-2">
              Ingresa tu ubicación para ver el stock disponible y opciones de despacho en tu zona.
            </p>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Región</label>
              <select 
                value={region} 
                onChange={handleRegionChange}
                className="w-full border-2 border-slate-200 rounded-md py-3 px-3 focus:outline-none focus:border-primary transition-colors text-slate-700"
                required
              >
                <option value="">Selecciona una región</option>
                {regionesChile.map(r => (
                  <option key={r.region} value={r.region}>{r.region}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Comuna</label>
              <select 
                value={comuna} 
                onChange={(e) => setComuna(e.target.value)}
                disabled={!region}
                className="w-full border-2 border-slate-200 rounded-md py-3 px-3 focus:outline-none focus:border-primary transition-colors text-slate-700 disabled:opacity-50 disabled:bg-slate-50"
                required
              >
                <option value="">Selecciona una comuna</option>
                {selectedRegionData && selectedRegionData.comunas.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-md transition-colors mt-2 uppercase tracking-wide">
              Guardar Ubicación
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

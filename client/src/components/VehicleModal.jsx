import { useState } from 'react';
import { X, Car, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVehicleStore } from '../store/store';
import toast from 'react-hot-toast';

export default function VehicleModal({ isOpen, onClose }) {
  const { vehicle, setVehicle, clearVehicle } = useVehicleStore();
  const [loading, setLoading] = useState(false);
  
  // Base de datos extensa de marcas y modelos en Chile
  const modelsByBrand = {
    'Alfa Romeo': ['Giulia', 'Stelvio', 'Tonale'],
    'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron'],
    'BMW': ['Serie 1', 'Serie 2', 'Serie 3', 'Serie 4', 'Serie 5', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7'],
    'Changan': ['Alsvin', 'CS15', 'CS35 Plus', 'CS55 Plus', 'CS75', 'CX70', 'Hunter', 'UNI-T', 'UNI-K'],
    'Chery': ['Tiggo 2', 'Tiggo 2 Pro', 'Tiggo 3', 'Tiggo 7 Pro', 'Tiggo 8', 'Tiggo 8 Pro', 'Arrizo 5'],
    'Chevrolet': ['Spark', 'Sail', 'Onix', 'Prisma', 'Cavalier', 'Tracker', 'Captiva', 'Equinox', 'Blazer', 'Tahoe', 'Colorado', 'Silverado', 'Groove', 'Montana'],
    'Citroën': ['C3', 'C3 Aircross', 'C4', 'C4 Cactus', 'C5 Aircross', 'Berlingo'],
    'DFSK': ['580', 'Glory 560', 'Serie K'],
    'Dodge': ['Durango', 'Journey', 'Charger', 'Challenger'],
    'Dongfeng': ['AX7', 'Joyear', 'SX5'],
    'Fiat': ['500', 'Mobi', 'Argo', 'Cronos', 'Pulse', 'Fastback', 'Fiorino', 'Strada', 'Toro'],
    'Ford': ['Ka', 'Fiesta', 'Focus', 'EcoSport', 'Puma', 'Escape', 'Territory', 'Edge', 'Explorer', 'Expedition', 'Ranger', 'F-150', 'Maverick', 'Mustang', 'Bronco'],
    'GWM (Great Wall)': ['Poer', 'Wingle 5', 'Wingle 7'],
    'Haval': ['Jolion', 'H6', 'Dargo'],
    'Honda': ['Fit', 'City', 'Civic', 'Accord', 'HR-V', 'CR-V', 'Pilot', 'Ridgeline'],
    'Hyundai': ['Atos', 'Grand i10', 'Accent', 'Elantra', 'Sonata', 'Venue', 'Creta', 'Tucson', 'Santa Fe', 'Palisade', 'Kona', 'H-1', 'Staria'],
    'JAC': ['JS2', 'JS3', 'JS4', 'JS8', 'T8', 'T8 Pro', 'T6'],
    'Jeep': ['Renegade', 'Compass', 'Commander', 'Cherokee', 'Grand Cherokee', 'Wrangler', 'Gladiator'],
    'Jetour': ['X70', 'X70 Plus', 'Dashing'],
    'Kia': ['Morning', 'Soluto', 'Rio', 'Cerato', 'Sonet', 'Seltos', 'Sportage', 'Sorento', 'Carnival', 'Frontier', 'Niro'],
    'Lexus': ['IS', 'ES', 'NX', 'RX', 'UX', 'GX'],
    'Mahindra': ['Pik Up', 'XUV500', 'Scorpio'],
    'Maxus': ['T60', 'T90', 'D60', 'Deliver 3', 'Deliver 9'],
    'Mazda': ['Mazda2', 'Mazda3', 'Mazda6', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'CX-9', 'BT-50'],
    'Mercedes-Benz': ['Clase A', 'Clase C', 'Clase E', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'Sprinter', 'Vito'],
    'MG': ['MG3', 'MG5', 'MG GT', 'ZS', 'ZX', 'HS', 'RX5', 'Marvel R'],
    'MINI': ['Cooper', 'Countryman', 'Clubman'],
    'Mitsubishi': ['Mirage', 'Lancer', 'ASX', 'Eclipse Cross', 'Outlander', 'Montero Sport', 'L200'],
    'Nissan': ['March', 'Versa', 'Sentra', 'V-Drive', 'Kicks', 'Qashqai', 'X-Trail', 'Pathfinder', 'Murano', 'Navara'],
    'Peugeot': ['208', '308', '508', '2008', '3008', '5008', 'Partner', 'Expert', 'Boxer', 'Landtrek'],
    'Porsche': ['Macan', 'Cayenne', 'Panamera', '911', 'Taycan'],
    'RAM': ['700', '1000', '1500', '2500'],
    'Renault': ['Kwid', 'Clio', 'Symbol', 'Logan', 'Sandero', 'Stepway', 'Duster', 'Captur', 'Koleos', 'Arkana', 'Kangoo', 'Oroch'],
    'SsangYong': ['Tivoli', 'Korando', 'Torres', 'Rexton', 'Musso', 'Musso Grand'],
    'Subaru': ['Impreza', 'Legacy', 'XV', 'Crosstrek', 'Forester', 'Outback', 'Evoltis', 'WRX'],
    'Suzuki': ['Alto', 'S-Presso', 'Celerio', 'Swift', 'Baleno', 'Dzire', 'Ciaz', 'Ignis', 'Vitara', 'S-Cross', 'Jimny', 'Ertiga', 'XL7'],
    'Toyota': ['Aygo', 'Yaris', 'Corolla', 'Camry', 'Raize', 'Yaris Cross', 'Corolla Cross', 'RAV4', 'Fortuner', '4Runner', 'Land Cruiser', 'Hilux', 'Hiace'],
    'Volkswagen': ['Gol', 'Polo', 'Virtus', 'Nivus', 'T-Cross', 'Taos', 'Tiguan', 'Atlas', 'Saveiro', 'Amarok'],
    'Volvo': ['XC40', 'XC60', 'XC90', 'S60', 'V60']
  };

  const brands = Object.keys(modelsByBrand).sort();
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 25}, (_, i) => currentYear - i);

  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedBrand || !selectedModel || !selectedYear) return;
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const newVehicle = {
        marca: selectedBrand,
        modelo: selectedModel,
        ano: selectedYear,
        motor: 'Estándar',
        patente: null // Ya no usamos patente
      };
      
      setVehicle(newVehicle);
      toast.success(`Vehículo ${newVehicle.marca} ${newVehicle.modelo} seleccionado.`);
      onClose();
    }, 500);
  };

  const handleClear = () => {
    setSelectedBrand('');
    setSelectedModel('');
    setSelectedYear('');
  };

  const isFormValid = selectedBrand && selectedModel && selectedYear;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Car className="text-primary w-6 h-6" /> Selecciona tu vehículo
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-white rounded-full shadow-sm border border-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 sm:p-6 flex flex-col flex-grow">
            {vehicle && (
              <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-lg flex items-start gap-3">
                <CheckCircle className="text-green-500 w-5 h-5 mt-0.5" />
                <div className="flex-grow">
                  <h3 className="font-bold text-green-800 text-sm">Vehículo actual</h3>
                  <p className="text-green-700 font-medium text-lg">{vehicle.marca} {vehicle.modelo} {vehicle.ano}</p>
                </div>
                <button 
                  onClick={clearVehicle}
                  className="text-green-600 hover:text-green-800 text-xs font-bold underline"
                >
                  Remover
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-slate-500 mb-2">
                Selecciona las características de tu auto para asegurar compatibilidad.
              </p>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Marca</label>
                <select 
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setSelectedModel('');
                  }}
                  className="w-full border-2 border-slate-200 rounded-md py-3 px-3 focus:border-primary outline-none transition-colors"
                  required
                >
                  <option value="">Selecciona la marca</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Modelo</label>
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={!selectedBrand}
                  className="w-full border-2 border-slate-200 rounded-md py-3 px-3 focus:border-primary outline-none transition-colors disabled:opacity-50 disabled:bg-slate-50"
                  required
                >
                  <option value="">Selecciona el modelo</option>
                  {selectedBrand && modelsByBrand[selectedBrand]?.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Año</label>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  disabled={!selectedModel}
                  className="w-full border-2 border-slate-200 rounded-md py-3 px-3 focus:border-primary outline-none transition-colors disabled:opacity-50 disabled:bg-slate-50"
                  required
                >
                  <option value="">Selecciona el año</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={handleClear} disabled={!selectedBrand} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-md transition-colors disabled:opacity-50 uppercase tracking-wide">
                  Limpiar
                </button>
                <button type="submit" disabled={!isFormValid || loading} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:opacity-50 uppercase tracking-wide flex justify-center items-center">
                  {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : 'Aplicar'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

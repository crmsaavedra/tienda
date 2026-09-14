import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../store/store';
import { Save, ArrowLeft, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const isNew = id === 'nuevo';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const [product, setProduct] = useState({
    sku: 'SKU-' + Math.floor(Math.random() * 1000000),
    name: '',
    brand: '',
    category: '',
    price: 0,
    stock: 0,
    lowStockThreshold: 5,
    description: '',
    image: '',
    gallery: [],
    technicalSpecs: [],
    compatibility: [],
    notes: [],
    active: true,
    discountPercent: 0
  });

  useEffect(() => {
    if (!isNew) {
      axios.get(`/api/parts/${id}`)
        .then(res => {
          setProduct(res.data);
          setLoading(false);
        })
        .catch(err => {
          toast.error('Error al cargar producto');
          navigate('/admin');
        });
    }
  }, [id, isNew, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProduct(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  const handleImageUpload = async (e, isGallery = false) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    const loadToast = toast.loading('Subiendo imagen...');
    try {
      const res = await axios.post('/api/admin/upload', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (isGallery) {
        setProduct(prev => ({ ...prev, gallery: [...prev.gallery, res.data.url] }));
      } else {
        setProduct(prev => ({ ...prev, image: res.data.url }));
      }
      toast.success('Imagen subida', { id: loadToast });
    } catch (err) {
      toast.error('Error al subir imagen', { id: loadToast });
    }
  };

  const removeGalleryImage = (index) => {
    setProduct(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index)
    }));
  };

  const handleArrayChange = (field, index, subfield, value) => {
    setProduct(prev => {
      const newArray = [...prev[field]];
      newArray[index][subfield] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field, defaultItem) => {
    setProduct(prev => ({ ...prev, [field]: [...prev[field], defaultItem] }));
  };

  const removeArrayItem = (field, index) => {
    setProduct(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    if (!product.name || !product.sku || !product.price) {
      return toast.error('Faltan campos obligatorios (Nombre, SKU, Precio)');
    }

    setSaving(true);
    const loadToast = toast.loading('Guardando...');
    try {
      const url = isNew ? '/api/admin/parts' : `/api/admin/parts/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await axios({
        method,
        url,
        data: product,
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Producto guardado correctamente', { id: loadToast });
      if (isNew) {
        navigate(`/admin`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar', { id: loadToast });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{isNew ? 'Nuevo Repuesto' : `Editando: ${product.name}`}</h1>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
            <input type="checkbox" name="active" checked={product.active} onChange={handleChange} className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary" />
            Visible en tienda
          </label>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Side: Images */}
        <div className="w-full md:w-1/3 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Imagen Principal</h3>
            <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
              {product.image ? (
                <>
                  <img src={product.image} alt="Principal" className="w-full h-full object-contain mix-blend-multiply" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <label className="cursor-pointer bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-slate-50">
                      Cambiar Imagen
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, false)} />
                    </label>
                  </div>
                </>
              ) : (
                <label className="cursor-pointer flex flex-col items-center text-slate-500 hover:text-primary transition-colors">
                  <ImageIcon className="w-10 h-10 mb-2" />
                  <span className="text-sm font-medium">Subir imagen</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, false)} />
                </label>
              )}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Galería</h3>
            <div className="grid grid-cols-3 gap-3">
              {product.gallery.map((img, idx) => (
                <div key={idx} className="aspect-square bg-slate-50 rounded-lg border border-slate-200 relative group overflow-hidden">
                  <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                  <button onClick={() => removeGalleryImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="aspect-square bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-primary hover:text-primary transition-colors text-slate-400">
                <Plus className="w-6 h-6" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} />
              </label>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-2/3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button onClick={() => setActiveTab('basic')} className={`px-6 py-3 text-sm font-bold ${activeTab === 'basic' ? 'text-primary border-b-2 border-primary bg-white' : 'text-slate-500 hover:bg-slate-100'}`}>Información Básica</button>
              <button onClick={() => setActiveTab('specs')} className={`px-6 py-3 text-sm font-bold ${activeTab === 'specs' ? 'text-primary border-b-2 border-primary bg-white' : 'text-slate-500 hover:bg-slate-100'}`}>Especificaciones</button>
              <button onClick={() => setActiveTab('compat')} className={`px-6 py-3 text-sm font-bold ${activeTab === 'compat' ? 'text-primary border-b-2 border-primary bg-white' : 'text-slate-500 hover:bg-slate-100'}`}>Compatibilidad</button>
              <button onClick={() => setActiveTab('notes')} className={`px-6 py-3 text-sm font-bold ${activeTab === 'notes' ? 'text-primary border-b-2 border-primary bg-white' : 'text-slate-500 hover:bg-slate-100'}`}>Notas Adicionales</button>
            </div>

            <div className="p-6">
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Repuesto</label>
                      <input type="text" name="name" value={product.name} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">SKU</label>
                      <input type="text" name="sku" value={product.sku} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md focus:ring-primary focus:border-primary uppercase" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Marca</label>
                      <input type="text" name="brand" value={product.brand} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Categoría</label>
                      <input type="text" name="category" value={product.category} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Descripción</label>
                    <textarea name="description" value={product.description} onChange={handleChange} rows={4} className="w-full p-2 border border-slate-300 rounded-md focus:ring-primary focus:border-primary"></textarea>
                  </div>

                  <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Precio ($)</label>
                      <input type="number" name="price" value={product.price} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Descuento (%)</label>
                      <input type="number" name="discountPercent" value={product.discountPercent} onChange={handleChange} min="0" max="100" className="w-full p-2 border border-slate-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Stock Actual</label>
                      <input type="number" name="stock" value={product.stock} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Alerta Stock Bajo</label>
                      <input type="number" name="lowStockThreshold" value={product.lowStockThreshold} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'specs' && (
                <div>
                  <div className="space-y-3 mb-4">
                    {product.technicalSpecs.map((spec, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <input type="text" value={spec.label} onChange={(e) => handleArrayChange('technicalSpecs', idx, 'label', e.target.value)} placeholder="Ej: Material" className="w-1/3 p-2 border border-slate-300 rounded-md text-sm" />
                        <input type="text" value={spec.value} onChange={(e) => handleArrayChange('technicalSpecs', idx, 'value', e.target.value)} placeholder="Ej: Acero" className="flex-1 p-2 border border-slate-300 rounded-md text-sm" />
                        <button onClick={() => removeArrayItem('technicalSpecs', idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addArrayItem('technicalSpecs', { label: '', value: '' })} className="text-sm font-bold text-primary hover:text-orange-600 flex items-center">
                    <Plus className="w-4 h-4 mr-1" /> Añadir Especificación
                  </button>
                </div>
              )}

              {activeTab === 'compat' && (
                <div>
                  <div className="space-y-4 mb-4">
                    {product.compatibility.map((c, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative">
                        <button onClick={() => removeArrayItem('compatibility', idx)} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="col-span-2 md:col-span-1">
                            <label className="text-xs text-slate-500 font-bold block mb-1">Marca</label>
                            <input type="text" value={c.make} onChange={(e) => handleArrayChange('compatibility', idx, 'make', e.target.value)} className="w-full p-1.5 text-sm border border-slate-300 rounded focus:border-primary" />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <label className="text-xs text-slate-500 font-bold block mb-1">Modelo</label>
                            <input type="text" value={c.model} onChange={(e) => handleArrayChange('compatibility', idx, 'model', e.target.value)} className="w-full p-1.5 text-sm border border-slate-300 rounded focus:border-primary" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 font-bold block mb-1">Año Desde</label>
                            <input type="number" value={c.yearFrom} onChange={(e) => handleArrayChange('compatibility', idx, 'yearFrom', Number(e.target.value))} className="w-full p-1.5 text-sm border border-slate-300 rounded focus:border-primary" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 font-bold block mb-1">Año Hasta</label>
                            <input type="number" value={c.yearTo} onChange={(e) => handleArrayChange('compatibility', idx, 'yearTo', Number(e.target.value))} className="w-full p-1.5 text-sm border border-slate-300 rounded focus:border-primary" />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <label className="text-xs text-slate-500 font-bold block mb-1">Motor</label>
                            <input type="text" value={c.engine} onChange={(e) => handleArrayChange('compatibility', idx, 'engine', e.target.value)} className="w-full p-1.5 text-sm border border-slate-300 rounded focus:border-primary" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addArrayItem('compatibility', { make: '', model: '', yearFrom: 2000, yearTo: 2024, engine: '' })} className="text-sm font-bold text-primary hover:text-orange-600 flex items-center">
                    <Plus className="w-4 h-4 mr-1" /> Añadir Vehículo
                  </button>
                </div>
              )}

              {activeTab === 'notes' && (
                <div>
                  <div className="space-y-4 mb-4">
                    {product.notes.map((note, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex-1 space-y-2">
                          <input type="text" value={note.title} onChange={(e) => handleArrayChange('notes', idx, 'title', e.target.value)} placeholder="Título (ej: Garantía)" className="w-full p-2 text-sm font-bold border border-slate-300 rounded-md focus:border-primary" />
                          <textarea value={note.content} onChange={(e) => handleArrayChange('notes', idx, 'content', e.target.value)} placeholder="Contenido de la nota..." rows={2} className="w-full p-2 text-sm border border-slate-300 rounded-md focus:border-primary"></textarea>
                        </div>
                        <button onClick={() => removeArrayItem('notes', idx)} className="p-2 mt-1 text-red-500 hover:bg-red-100 rounded-md"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addArrayItem('notes', { title: '', content: '' })} className="text-sm font-bold text-primary hover:text-orange-600 flex items-center">
                    <Plus className="w-4 h-4 mr-1" /> Añadir Nota
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

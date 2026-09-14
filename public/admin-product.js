const token = localStorage.getItem('apToken');
if (!token) {
  window.location.href = '/login';
}

const segments = location.pathname.split('/');
const productId = segments[segments.length - 1];

let currentProduct = null;

async function loadProduct() {
  if (productId === 'nuevo') {
    currentProduct = {
      sku: 'SKU-' + Math.floor(Math.random() * 1000000),
      name: 'Nuevo Repuesto',
      brand: 'Marca',
      category: 'Categoría',
      price: 0,
      stock: 0,
      lowStockThreshold: 5,
      description: 'Escribe aquí la descripción detallada del producto...',
      image: 'https://images.unsplash.com/photo-1598006456108-9c17df20b0b8?auto=format&fit=crop&w=600&q=80',
      gallery: [],
      technicalSpecs: [],
      compatibility: [],
      active: true
    };
    renderProduct(currentProduct);
    return;
  }

  try {
    const res = await fetch(`/api/parts/${productId}`);
    if (!res.ok) throw new Error('Error al cargar producto');
    currentProduct = await res.json();
    renderProduct(currentProduct);
  } catch (error) {
    console.error(error);
    alert('No se pudo cargar el producto');
  }
}

function renderProduct(p) {
  const container = document.querySelector('#product-view');
  if (!container) return;

  const specsHtml = (p.technicalSpecs || []).map(s => `
    <div class="spec-row" style="display:flex; gap:10px; margin-bottom:5px;">
      <dt contenteditable="true" class="spec-label" style="border-bottom: 1px dashed #ccc; min-width:100px;">${s.label}</dt>
      <dd contenteditable="true" class="spec-value" style="border-bottom: 1px dashed #ccc; flex:1;">${s.value}</dd>
      <button class="btn btn-danger remove-spec" style="margin-left:8px;" title="Eliminar">&times;</button>
    </div>
  `).join('');

  const compatHtml = (p.compatibility || []).map(c => `
    <div class="compat-row" style="margin-bottom:10px; border:1px solid #ddd; padding:10px; border-radius:4px; position:relative;">
      <div>Marca: <span contenteditable="true" class="compat-make" style="border-bottom:1px dashed #ccc;">${c.make}</span></div>
      <div>Modelo: <span contenteditable="true" class="compat-model" style="border-bottom:1px dashed #ccc;">${c.model}</span></div>
      <div>Año Desde: <span contenteditable="true" class="compat-yearFrom" style="border-bottom:1px dashed #ccc;">${c.yearFrom}</span></div>
      <div>Año Hasta: <span contenteditable="true" class="compat-yearTo" style="border-bottom:1px dashed #ccc;">${c.yearTo}</span></div>
      <div>Motor: <span contenteditable="true" class="compat-engine" style="border-bottom:1px dashed #ccc;">${c.engine}</span></div>
      <button class="btn btn-danger remove-compat" style="position:absolute; top:10px; right:10px;">Eliminar</button>
    </div>
  `).join('');

  const defaultNotes = [
    { title: 'Instalación', content: 'Recomendamos instalación por un técnico calificado. El desempeño y garantía del producto dependen de un montaje adecuado.' },
    { title: 'Devoluciones', content: 'Solicita una devolución dentro de 10 días con el repuesto sin uso, en su envase original y con comprobante de compra.' }
  ];
  const notesToRender = (p.notes && p.notes.length > 0) ? p.notes : defaultNotes;

  const notesHtml = notesToRender.map(n => `
    <div class="info-card note-row" style="position:relative;">
      <h2 contenteditable="true" class="note-title" style="border-bottom:1px dashed #ccc; display:inline-block; margin-bottom:10px;">${n.title}</h2>
      <p contenteditable="true" class="note-content" style="border-bottom:1px dashed #ccc; min-height:40px;">${n.content}</p>
      <button class="btn btn-danger remove-note" style="position:absolute; top:10px; right:10px;">Eliminar</button>
    </div>
  `).join('');

  const allImages = [p.image, ...(p.gallery || [])].filter(Boolean);
  const galleryHtml = `<div class="thumbnails" id="gallery-thumbs">
    ${allImages.map((img, i) => `
      <div style="position:relative; display:inline-block;" class="thumb-wrap">
        <img src="${img}" class="thumb ${i === 0 ? 'active' : ''}" data-idx="${i}" alt="Thumbnail">
        ${i > 0 ? `<button class="remove-thumb" data-idx="${i}" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px; line-height:1;">&times;</button>` : ''}
      </div>
    `).join('')}
    <button id="add-gallery-btn" style="width:80px; height:80px; border:2px dashed #ccc; border-radius:4px; background:none; cursor:pointer; font-size:24px; color:#999; flex-shrink:0;">+</button>
  </div>`;

  container.innerHTML = `
    <div class="detail-image">
      <div style="position:relative; display:flex; justify-content:center; align-items:center; min-height:450px;">
        <img src="${p.image}" alt="Imagen principal" id="product-image" style="max-width:100%; max-height:450px; object-fit:contain;">
        <button id="change-img-btn" class="btn btn-secondary" style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.9); box-shadow:0 4px 12px rgba(0,0,0,0.1); z-index:10;">✎ Cambiar Principal</button>
      </div>
      ${galleryHtml}
    </div>
    <div class="detail-content">
      <span class="part-meta">
        <span class="editable" contenteditable="true" data-field="brand" style="border-bottom:1px dashed #ccc;">${p.brand}</span> · 
        <span class="editable" contenteditable="true" data-field="category" style="border-bottom:1px dashed #ccc;">${p.category}</span> · Código 
        <span class="editable" contenteditable="true" data-field="sku" style="border-bottom:1px dashed #ccc;">${p.sku}</span>
      </span>
      <h1><span class="editable" contenteditable="true" data-field="name" style="border-bottom:1px dashed #ccc;">${p.name}</span></h1>
      <p class="detail-description"><span class="editable" contenteditable="true" data-field="description" style="border-bottom:1px dashed #ccc;">${p.description}</span></p>
      
      <p class="detail-price" style="display:flex; align-items:baseline; gap:15px;">
        <span>$ <input type="number" class="editable price-input" data-field="price" value="${p.price}" style="border:none; border-bottom:1px dashed #ccc; font-size:inherit; font-weight:bold; width:150px; outline:none; background:transparent;"></span>
        <span style="font-size:16px; color:#ef4444; font-weight:normal;">-<input type="number" class="editable" data-field="discountPercent" value="${p.discountPercent || 0}" min="0" max="100" style="width:40px; border:none; border-bottom:1px dashed #ccc; font-size:inherit; background:transparent;">% dto.</span>
      </p>
      
      <div class="stock" style="margin-bottom:15px; padding:10px; background:#f9f9f9; border-radius:4px;">
        <label>Stock actual: <input type="number" class="editable" data-field="stock" value="${p.stock}" style="width:60px;"></label><br>
        <label>Alerta stock bajo: <input type="number" class="editable" data-field="lowStockThreshold" value="${p.lowStockThreshold}" style="width:60px;"></label>
      </div>

      <button class="primary" disabled>Agregar al carrito (Deshabilitado en edición)</button>
      
      <div class="purchase-benefits">
        <div><b>Despacho seguro</b>Preparamos y embalamos tu pedido para proteger cada componente.</div>
        <div><b>Garantía de calidad</b>6 meses de cobertura por fallas de fabricación.</div>
        <div><b>Asesoría de compatibilidad</b>Confirma tu VIN o patente con nuestro equipo antes de comprar.</div>
      </div>
      <p class="detail-notice">Antes de instalar, verifica que el código de la pieza y la aplicación sean compatibles con tu vehículo. Conserva el embalaje original para cualquier gestión de garantía.</p>

      <div class="detail-block" style="margin-top:30px;">
        <h2>Especificaciones técnicas</h2>
        <dl id="specs-list">
          ${specsHtml}
        </dl>
        <button id="add-spec-btn" style="margin-top:14px;" class="btn btn-outline">+ Añadir especificación</button>
      </div>
      
      <div class="detail-block" style="margin-top:30px;">
        <h2>Compatibilidad</h2>
        <div id="compat-list">
          ${compatHtml}
        </div>
        <button id="add-compat-btn" style="margin-top:14px;" class="btn btn-outline">+ Añadir vehículo</button>
      </div>
      
      <div class="detail-block" style="margin-top:30px;">
        <h2>Notas y Servicios</h2>
        <div class="detail-columns" id="notes-list">
          ${notesHtml}
        </div>
        <button id="add-note-btn" style="margin-top:14px;" class="btn btn-outline">+ Añadir nota</button>
      </div>
    </div>
  `;

  // Sync checkboxes & title
  document.getElementById('active-checkbox').checked = p.active !== false;
  
  if (productId === 'nuevo') {
    document.getElementById('editor-title-indicator').textContent = 'Crear Nuevo Producto';
    document.getElementById('save-product').textContent = 'Crear Producto';
  } else {
    document.getElementById('editor-title-indicator').textContent = 'Editando: ' + p.name;
  }

  bindEvents();
}

function bindEvents() {
  document.getElementById('change-img-btn').addEventListener('click', () => {
    const newUrl = prompt('Nueva URL de imagen:', currentProduct.image);
    if (newUrl) {
      currentProduct.image = newUrl;
      document.getElementById('product-image').src = newUrl;
    }
  });

  document.getElementById('add-spec-btn').addEventListener('click', () => {
    const specsList = document.getElementById('specs-list');
    const div = document.createElement('div');
    div.className = 'spec-row';
    div.style.cssText = 'display:flex; gap:10px; margin-bottom:5px;';
    div.innerHTML = `
      <dt contenteditable="true" class="spec-label" style="border-bottom: 1px dashed #ccc; min-width:100px;">Nueva Espec</dt>
      <dd contenteditable="true" class="spec-value" style="border-bottom: 1px dashed #ccc; flex:1;">Valor</dd>
      <button class="btn btn-danger remove-spec" style="margin-left:8px;" title="Eliminar">&times;</button>
    `;
    specsList.appendChild(div);
  });

  document.getElementById('add-compat-btn').addEventListener('click', () => {
    const compatList = document.getElementById('compat-list');
    const div = document.createElement('div');
    div.className = 'compat-row';
    div.style.cssText = 'margin-bottom:10px; border:1px solid #ddd; padding:10px; border-radius:4px; position:relative;';
    div.innerHTML = `
      <div>Marca: <span contenteditable="true" class="compat-make" style="border-bottom:1px dashed #ccc;">Marca</span></div>
      <div>Modelo: <span contenteditable="true" class="compat-model" style="border-bottom:1px dashed #ccc;">Modelo</span></div>
      <div>Año Desde: <span contenteditable="true" class="compat-yearFrom" style="border-bottom:1px dashed #ccc;">2000</span></div>
      <div>Año Hasta: <span contenteditable="true" class="compat-yearTo" style="border-bottom:1px dashed #ccc;">2020</span></div>
      <div>Motor: <span contenteditable="true" class="compat-engine" style="border-bottom:1px dashed #ccc;">Motor</span></div>
      <button class="btn btn-danger remove-compat" style="position:absolute; top:10px; right:10px;">Eliminar</button>
    `;
    compatList.appendChild(div);
  });

  document.getElementById('add-note-btn').addEventListener('click', () => {
    const notesList = document.getElementById('notes-list');
    const div = document.createElement('div');
    div.className = 'info-card note-row';
    div.style.cssText = 'position:relative;';
    div.innerHTML = `
      <h2 contenteditable="true" class="note-title" style="border-bottom:1px dashed #ccc; display:inline-block; margin-bottom:10px;">Nuevo Servicio</h2>
      <p contenteditable="true" class="note-content" style="border-bottom:1px dashed #ccc; min-height:40px;">Descripción detallada aquí...</p>
      <button class="btn btn-danger remove-note" style="position:absolute; top:10px; right:10px;">Eliminar</button>
    `;
    notesList.appendChild(div);
  });

  document.querySelector('#product-view').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-spec')) {
      e.target.closest('.spec-row').remove();
    } else if (e.target.classList.contains('remove-compat')) {
      e.target.closest('.compat-row').remove();
    } else if (e.target.classList.contains('remove-note')) {
      e.target.closest('.note-row').remove();
    } else if (e.target.classList.contains('remove-thumb')) {
      e.target.closest('.thumb-wrap').remove();
    } else if (e.target.classList.contains('thumb')) {
      document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      document.getElementById('product-image').src = e.target.src;
    } else if (e.target.id === 'add-gallery-btn') {
      const url = prompt('URL de la nueva foto:');
      if (url) {
        const btn = document.getElementById('add-gallery-btn');
        const wrap = document.createElement('div');
        wrap.className = 'thumb-wrap';
        wrap.style.cssText = 'position:relative; display:inline-block;';
        wrap.innerHTML = `<img src="${url}" class="thumb" alt="Thumbnail"><button class="remove-thumb" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px; line-height:1;">&times;</button>`;
        btn.parentNode.insertBefore(wrap, btn);
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadProduct();

  const saveBtn = document.getElementById('save-product');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!currentProduct) return;

      const updatedProduct = { ...currentProduct };

      // Text fields and simple inputs
      document.querySelectorAll('[data-field]').forEach(el => {
        const field = el.getAttribute('data-field');
        if (el.tagName === 'INPUT') {
          updatedProduct[field] = el.type === 'number' ? Number(el.value) : el.value;
        } else {
          updatedProduct[field] = el.innerText.trim();
        }
      });

      // Specs
      const specs = [];
      document.querySelectorAll('.spec-row').forEach(row => {
        const label = row.querySelector('.spec-label').innerText.trim();
        const value = row.querySelector('.spec-value').innerText.trim();
        if (label && value) specs.push({ label, value });
      });
      updatedProduct.technicalSpecs = specs;

      // Compatibility
      const compat = [];
      document.querySelectorAll('.compat-row').forEach(row => {
        compat.push({
          make: row.querySelector('.compat-make').innerText.trim(),
          model: row.querySelector('.compat-model').innerText.trim(),
          yearFrom: Number(row.querySelector('.compat-yearFrom').innerText.trim()) || 0,
          yearTo: Number(row.querySelector('.compat-yearTo').innerText.trim()) || 0,
          engine: row.querySelector('.compat-engine').innerText.trim()
        });
      });
      updatedProduct.compatibility = compat;

      // Notes
      const notes = [];
      document.querySelectorAll('.note-row').forEach(row => {
        const title = row.querySelector('.note-title').innerText.trim();
        const content = row.querySelector('.note-content').innerText.trim();
        if (title && content) notes.push({ title, content });
      });
      updatedProduct.notes = notes;

      // Gallery
      const galleryImgs = Array.from(document.querySelectorAll('.thumbnails .thumb')).map(img => img.src);
      if (galleryImgs.length > 0) {
        updatedProduct.image = galleryImgs[0];
        updatedProduct.gallery = galleryImgs.slice(1);
      } else {
        // Fallback if no thumbnails (e.g. all deleted)
        updatedProduct.gallery = [];
      }

      // Checkbox active
      updatedProduct.active = document.getElementById('active-checkbox').checked;

      toggleLoader(true, 'Guardando cambios...');

      try {
        const isNew = productId === 'nuevo';
        const url = isNew ? '/api/admin/parts' : `/api/admin/parts/${productId}`;
        const method = isNew ? 'POST' : 'PUT';

        const res = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedProduct)
        });

        if (!res.ok) throw new Error('Error al guardar');
        
        if (isNew) {
          const createdPart = await res.json();
          toggleLoader(true, 'Redirigiendo...');
          setTimeout(() => {
            window.location.replace(`/admin/producto/${createdPart._id}`);
          }, 800);
          return;
        }

        // Show toast
        toggleLoader(false);
        showToast('Guardado correctamente');
      } catch (error) {
        console.error(error);
        toggleLoader(false);
        alert('Error al guardar el producto');
      }
    });
  }
});

function toggleLoader(show, text = 'Cargando...') {
  let loader = document.getElementById('global-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.className = 'global-loader';
    loader.innerHTML = '<div class="spinner"></div><p id="loader-text"></p>';
    document.body.appendChild(loader);
  }
  document.getElementById('loader-text').textContent = text;
  if (show) loader.classList.add('active');
  else loader.classList.remove('active');
}

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#4CAF50; color:white; padding:15px; border-radius:4px; z-index:9999; transition: opacity 0.5s;';
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.style.opacity = '1';
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.style.display = 'none', 500);
  }, 3000);
}

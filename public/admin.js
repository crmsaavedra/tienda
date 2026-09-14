// 1. Auth Guard
if (!localStorage.apToken) {
    location.replace('/login');
    throw new Error('redirect');
}
try {
    const _p = JSON.parse(atob(localStorage.apToken.split('.')[1]));
    if (_p.exp * 1000 < Date.now()) {
        delete localStorage.apToken;
        location.replace('/login');
        throw new Error('redirect');
    }
    
    // 2. Admin user info
    setTimeout(() => {
        const userEl = document.querySelector('#admin-user');
        if (userEl) userEl.textContent = _p.name || _p.email || 'Admin';
    }, 0);
} catch (e) {
    if (e.message === 'redirect') throw e;
}

// Global helpers & state
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const money = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

let parts = [];
let discounts = [];
let orders = [];

// API helper
async function api(url, o = {}) {
    const r = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.apToken || ''}`
        },
        ...o
    });
    const d = r.status === 204 ? null : await r.json();
    if (!r.ok) throw Error(d.error || 'Error');
    return d;
}

const alertError = e => {
    const el = $('#admin-feedback');
    if (el) el.textContent = e.message;
};

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

// 11. Toast function
function showToast(message) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(window._toastT);
    window._toastT = setTimeout(() => t.classList.remove('show'), 2500);
}

// 3. Tab navigation system
function setupTabs() {
    const tabs = $$('[data-tab]');
    const panels = $$('[data-panel]');
    
    const activateTab = (tabId) => {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
        panels.forEach(p => p.classList.toggle('active', p.dataset.panel === tabId));
        sessionStorage.setItem('adminActiveTab', tabId);
    };

    tabs.forEach(t => t.addEventListener('click', () => activateTab(t.dataset.tab)));

    const activeTab = sessionStorage.getItem('adminActiveTab') || 'dashboard';
    if ($(`[data-tab="${activeTab}"]`)) activateTab(activeTab);
}

// Helper for order status badge
function getStatusBadge(status) {
    switch (status) {
        case 'paid': return '<span class="badge badge-success">Pagado</span>';
        case 'pending': return '<span class="badge badge-warning">Pendiente</span>';
        case 'cancelled': return '<span class="badge badge-danger">Cancelado</span>';
        case 'refunded': return '<span class="badge badge-info">Reembolsado</span>';
        default: return `<span class="badge badge-muted">${status}</span>`;
    }
}

// Main load function
async function load() {
    try {
        const [dash, p, d] = await Promise.all([
            api('/api/admin/dashboard'),
            api('/api/admin/parts'),
            api('/api/admin/discounts')
        ]);
        
        parts = p;
        discounts = d;
        orders = dash.orders || [];

        const activePartsCount = parts.filter(x => x.active !== false).length;

        // 4. Dashboard stats
        const statsEl = $('#stats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="stat-card"><div class="stat-icon">🛒</div><div class="stat-info"><small>VENTAS CONFIRMADAS</small><b>${dash.sales?.count || 0}</b></div></div>
                <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-info"><small>INGRESOS</small><b>${money(dash.sales?.revenue)}</b></div></div>
                <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-info"><small>PRODUCTOS ACTIVOS</small><b>${activePartsCount}</b></div></div>
                <div class="stat-card"><div class="stat-icon">⚠️</div><div class="stat-info"><small>STOCK BAJO</small><b>${dash.lowStock?.length || 0}</b></div></div>
            `;
        }

        // 6. Low stock alerts
        const alertsEl = $('#alerts');
        if (alertsEl) {
            alertsEl.innerHTML = dash.lowStock?.length ? '<div class="alerts-grid">' + dash.lowStock.map(x => {
                const threshold = x.lowStockThreshold || 1;
                const perc = Math.min(100, (x.stock / threshold) * 100);
                const color = perc < 25 ? '#ef4444' : (perc < 50 ? '#f97316' : '#eab308');
                return `<div class="alert">
                    <h4>${x.name}</h4>
                    <div class="alert-meta"><span>${x.stock} unidades</span><strong>mín. ${threshold}</strong></div>
                    <div class="stock-bar-wrap"><div class="stock-bar" style="width:${perc}%;background:${color}"></div></div>
                </div>`;
            }).join('') + '</div>' : '<p>Sin alertas de stock. ✓</p>';
        }

        // 5. Recent orders
        const recentOrdersEl = $('#recent-orders');
        if (recentOrdersEl) {
            const recent = orders.slice(0, 8);
            if (recent.length) {
                recentOrdersEl.innerHTML = `<table class="table" style="width:100%; text-align:left;">
                    <thead><tr><th>Fecha</th><th>Cliente</th><th>Items</th><th>Total</th><th>Estado</th></tr></thead>
                    <tbody>
                        ${recent.map(o => `<tr>
                            <td>${new Date(o.createdAt).toLocaleDateString('es-CL')}</td>
                            <td>${o.customerInfo?.name || o.customerInfo?.email || 'Desconocido'}</td>
                            <td>${o.items?.reduce((acc, i) => acc + i.qty, 0) || 0}</td>
                            <td>${money(o.total)}</td>
                            <td>${getStatusBadge(o.status)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>`;
            } else {
                recentOrdersEl.innerHTML = '<p>No hay pedidos recientes.</p>';
            }
        }

        // 7. Orders tab table
        const ordersTableEl = $('#orders-table');
        if (ordersTableEl) {
            ordersTableEl.innerHTML = orders.map(o => `<tr>
                <td>${String(o._id).slice(-6)}</td>
                <td>${new Date(o.createdAt).toLocaleDateString('es-CL')}</td>
                <td>
                    <strong>${o.customerInfo?.name || 'Cliente'}</strong><br>
                    <small style="color:var(--muted)">${o.customerInfo?.email || ''}</small><br>
                    ${o.customerInfo?.phone || o.customerInfo?.rut ? `<small style="color:var(--muted)">${o.customerInfo?.phone || ''} | ${o.customerInfo?.rut || ''}</small><br>` : ''}
                    ${o.customerInfo?.address ? `<small style="color:var(--muted)">📍 ${o.customerInfo?.address}</small>` : ''}
                </td>
                <td><small>${o.items?.map(i => i.name).join(', ') || ''}</small></td>
                <td>${money(o.total)}</td>
                <td>${getStatusBadge(o.status)}</td>
            </tr>`).join('');
        }

        renderParts();
        renderDiscounts();
    } catch (e) {
        alertError(e);
        if (e.message.includes('Sesión') || e.message.includes('No autorizado')) location.href = '/login';
    }
}

// 8. Parts table
function renderParts(filter = '') {
    const partsTableEl = $('#parts-table');
    if (!partsTableEl) return;
    
    const f = filter.toLowerCase();
    const filteredParts = parts.filter(p => 
        (p.name && p.name.toLowerCase().includes(f)) || 
        (p.sku && p.sku.toLowerCase().includes(f)) || 
        (p.brand && p.brand.toLowerCase().includes(f))
    );
    
    partsTableEl.innerHTML = filteredParts.map(p => {
        const isLowStock = p.stock <= (p.lowStockThreshold || 0);
        const stockBadge = `<span class="badge ${isLowStock ? 'badge-danger' : 'badge-success'}">${p.stock}</span>`;
        const activeBadge = p.active !== false 
            ? '<span class="badge badge-success">Activo</span>' 
            : '<span class="badge badge-muted">Oculto</span>';
        
        const img = p.image 
            ? `<img src="${p.image}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;flex-shrink:0" alt="${p.name}" onerror="this.outerHTML='<div style=\\'width:40px;height:40px;background:#eee;border-radius:4px;flex-shrink:0\\'></div>'">` 
            : `<div style="width:40px;height:40px;background:#eee;border-radius:4px;flex-shrink:0"></div>`;
        
        return `<tr>
            <td>${p.sku}</td>
            <td>
                <div style="display:flex; gap:12px; align-items:center;">
                    ${img}
                    <div>
                        <strong>${p.name}</strong><br>
                        <small style="color:var(--muted)">${p.brand} · ${p.category}</small>
                    </div>
                </div>
            </td>
            <td>${money(p.price)} ${p.discountPercent > 0 ? `<span class="badge badge-danger">-${p.discountPercent}%</span>` : ''}</td>
            <td>${stockBadge}</td>
            <td>${activeBadge}</td>
            <td class="actions">
                <button class="btn-small btn-edit" data-edit-part="${p._id}">Editar</button> 
                <button class="btn-small btn-delete" data-delete-part="${p._id}">${p.active !== false ? 'Ocultar' : 'Activar'}</button>
            </td>
        </tr>`;
    }).join('');
}

const partsSearch = $('#parts-search');
if (partsSearch) {
    partsSearch.addEventListener('input', e => renderParts(e.target.value));
}

// 9. Discounts table
function renderDiscounts() {
    const discountTableEl = $('#discount-table');
    if (!discountTableEl) return;
    
    const now = new Date();
    discountTableEl.innerHTML = discounts.map(d => {
        const isExpired = d.endAt ? new Date(d.endAt) < now : false;
        let activeBadge = '<span class="badge badge-muted">Inactivo</span>';
        if (d.active !== false) {
            if (isExpired) activeBadge = '<span class="badge badge-danger">Expirado</span>';
            else activeBadge = '<span class="badge badge-success">Activo</span>';
        }
        
        return `<tr>
            <td><strong>${d.code}</strong></td>
            <td>${d.type === 'percent' ? d.value + '%' : money(d.value)}</td>
            <td>${d.endAt ? new Date(d.endAt).toLocaleDateString('es-CL') : 'Sin fecha'}</td>
            <td>${activeBadge}</td>
            <td class="actions">
                <button class="btn-small btn-edit" data-edit-discount="${d._id}">Editar</button> 
                <button class="btn-small btn-delete" data-delete-discount="${d._id}">Eliminar</button>
            </td>
        </tr>`;
    }).join('');
}

// 10. Editor Modal
function editor(type, data = {}) {
    const isPart = type === 'part';
    const titleEl = $('#editor-title');
    if (titleEl) {
        titleEl.textContent = data._id ? 'Editar ' + (isPart ? 'repuesto' : 'descuento') : 'Nuevo ' + (isPart ? 'repuesto' : 'descuento');
    }
    
    const formEl = $('#editor-form');
    if (!formEl) return;

    formEl.innerHTML = isPart ? `
        <div class="modal-body">
            <div class="form-group"><label>SKU</label><input name="sku" placeholder="SKU" value="${data.sku || ''}" required></div>
            <div class="form-group"><label>Nombre</label><input name="name" placeholder="Nombre" value="${data.name || ''}" required></div>
            <div class="form-group"><label>Marca</label><input name="brand" placeholder="Marca" value="${data.brand || ''}" required></div>
            <div class="form-group"><label>Categoría</label><input name="category" placeholder="Categoría" value="${data.category || ''}" required></div>
            <div class="form-group"><label>Precio CLP</label><input name="price" type="number" min="0" placeholder="Precio CLP" value="${data.price || ''}" required></div>
            <div class="form-group"><label>Stock</label><input name="stock" type="number" min="0" placeholder="Stock" value="${data.stock ?? 0}" required></div>
            <div class="form-group"><label>Alerta de stock bajo</label><input name="lowStockThreshold" type="number" min="0" placeholder="Alerta de stock bajo" value="${data.lowStockThreshold ?? 5}"></div>
            <div class="form-group"><label>URL de imagen</label><input name="image" placeholder="URL de imagen" value="${data.image || ''}"></div>
            <div class="form-group"><label>Descripción</label><textarea name="description" placeholder="Descripción" required>${data.description || ''}</textarea></div>
            <div class="form-group"><label><input name="active" type="checkbox" ${data.active !== false ? 'checked' : ''}> Activo</label></div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary modal-close-btn">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
    ` : `
        <div class="modal-body">
            <div class="form-group"><label>Código</label><input name="code" placeholder="Código" value="${data.code || ''}" required></div>
            <div class="form-group"><label>Tipo</label><select name="type">
                <option value="percent" ${data.type === 'percent' ? 'selected' : ''}>Porcentaje</option>
                <option value="fixed" ${data.type === 'fixed' ? 'selected' : ''}>Monto fijo</option>
            </select></div>
            <div class="form-group"><label>Valor</label><input name="value" type="number" min="0" placeholder="Valor" value="${data.value || ''}" required></div>
            <div class="form-group"><label>Compra mínima</label><input name="minimumAmount" type="number" min="0" placeholder="Compra mínima" value="${data.minimumAmount || 0}"></div>
            <div class="form-group"><label>Vencimiento</label><input name="endAt" type="date" value="${data.endAt ? new Date(data.endAt).toISOString().slice(0, 10) : ''}" required></div>
            <div class="form-group"><label><input name="active" type="checkbox" ${data.active !== false ? 'checked' : ''}> Activo</label></div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary modal-close-btn">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
    `;
    
    const modal = $('#editor-modal');
    if (modal) modal.showModal();
    
    formEl.onsubmit = async e => {
        e.preventDefault();
        const form = Object.fromEntries(new FormData(e.target));
        
        if (isPart) {
            ['price', 'stock', 'lowStockThreshold'].forEach(k => form[k] = Number(form[k]));
            form.active = e.target.active.checked;
            if (!data._id) {
                form.technicalSpecs = [];
                form.compatibility = [];
            } else {
                form.technicalSpecs = data.technicalSpecs || [];
                form.compatibility = data.compatibility || [];
            }
        } else {
            form.value = Number(form.value);
            form.minimumAmount = Number(form.minimumAmount);
            form.active = e.target.active.checked;
        }
        
        try {
            toggleLoader(true, 'Guardando...');
            await api(`/api/admin/${isPart ? 'parts' : 'discounts'}${data._id ? '/' + data._id : ''}`, {
                method: data._id ? 'PUT' : 'POST',
                body: JSON.stringify(form)
            });
            if (modal) modal.close();
            toggleLoader(false);
            showToast(data._id ? 'Guardado correctamente' : 'Creado correctamente');
            load();
        } catch (err) {
            toggleLoader(false);
            alert(err.message);
        }
    };
}

// Global Event Delegation
document.addEventListener('click', async e => {
    const editPart = e.target.dataset.editPart;
    const editDiscount = e.target.dataset.editDiscount;
    
    if (editPart || editDiscount) {
        const isPart = !!editPart;
        const id = editPart || editDiscount;
        if (isPart) {
            location.href = `/admin/producto/${id}`;
            return;
        }
        return editor('discount', discounts.find(x => x._id === id));
    }
    
    const delPart = e.target.dataset.deletePart;
    const delDiscount = e.target.dataset.deleteDiscount;
    const del = delPart || delDiscount;
    
    if (del && confirm('¿Confirmas esta acción?')) {
        try {
            toggleLoader(true, 'Procesando...');
            await api(`/api/admin/${delPart ? 'parts' : 'discounts'}/${del}`, { method: 'DELETE' });
            toggleLoader(false);
            showToast('Acción realizada');
            load();
        } catch (err) {
            toggleLoader(false);
            alert(err.message);
        }
    }
});

const newPartBtn = $('#new-part');
const newDiscountBtn = $('#new-discount');
const modalCloseBtn = $('.modal-close');
const logoutBtn = $('#logout');

if (newPartBtn) newPartBtn.onclick = () => location.href = '/admin/producto/nuevo';
if (newDiscountBtn) newDiscountBtn.onclick = () => editor('discount');
if (modalCloseBtn) {
    const modal = $('#editor-modal');
    modalCloseBtn.onclick = () => { if (modal) modal.close(); };
}

// 13. Logout
if (logoutBtn) {
    logoutBtn.onclick = () => {
        delete localStorage.apToken;
        location.href = '/login';
    };
}

// 12. CMS Visual Editor
function initCMS() {
    // Avoid re-initializing if already present
    if (document.querySelector('.visual-editor')) return;

    const cms = document.createElement('section');
    cms.className = 'admin-section visual-editor';
    cms.style.cssText = 'padding: 0; margin-bottom: 0; border: none; background: transparent; box-shadow: none;';
    cms.innerHTML = `
        <div style="display: flex; gap: 30px; height: calc(100vh - 140px); margin-top: 10px;">
            <div style="flex: 0 0 420px; overflow-y: auto; padding-right: 15px; padding-bottom: 40px; scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent;">
                <h2 style="font-family: 'Barlow Condensed'; font-size: 24px; text-transform: uppercase; color: var(--navy); margin: 0 0 20px 0;">Diseño de la Tienda</h2>
                <form id="site-form">
                    
                    <!-- Apariencia -->
                    <div class="admin-section" style="margin-bottom: 20px; padding: 1.5rem;">
                        <h3 style="margin-bottom: 1.2rem; font-size: 18px; border-bottom: 1px solid var(--line); padding-bottom: 8px;">Colores de Marca</h3>
                        <div style="display:flex; gap:15px;">
                            <div class="form-group" style="flex:1; margin-bottom: 0;">
                                <label style="font-size: 12px; color: var(--muted); text-transform: uppercase;">Principal</label>
                                <div style="display:flex; align-items:center; gap:8px; border:1px solid var(--line); padding:4px; border-radius:6px;">
                                    <input name="primaryColor" type="color" data-preview style="width: 32px; height: 32px; padding: 0; border: none; cursor:pointer; background:none;">
                                    <span style="font-size:13px; font-family:monospace; color:var(--navy);">Color Base</span>
                                </div>
                            </div>
                            <div class="form-group" style="flex:1; margin-bottom: 0;">
                                <label style="font-size: 12px; color: var(--muted); text-transform: uppercase;">Secundario</label>
                                <div style="display:flex; align-items:center; gap:8px; border:1px solid var(--line); padding:4px; border-radius:6px;">
                                    <input name="secondaryColor" type="color" data-preview style="width: 32px; height: 32px; padding: 0; border: none; cursor:pointer; background:none;">
                                    <span style="font-size:13px; font-family:monospace; color:var(--navy);">Acentos</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Hero Section -->
                    <div class="admin-section" style="margin-bottom: 20px; padding: 1.5rem;">
                        <h3 style="margin-bottom: 1.2rem; font-size: 18px; border-bottom: 1px solid var(--line); padding-bottom: 8px;">Banner Principal</h3>
                        <div class="form-group">
                            <label style="font-size: 12px; color: var(--muted); text-transform: uppercase;">Antetítulo (Pequeño)</label>
                            <input name="heroEyebrow" type="text" placeholder="Ej: Repuestos con respaldo..." data-preview>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 12px; color: var(--muted); text-transform: uppercase;">Título Principal (Grande)</label>
                            <input name="heroTitle" type="text" placeholder="Tu vehículo merece..." data-preview style="font-weight: bold;">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 12px; color: var(--muted); text-transform: uppercase;">Descripción</label>
                            <textarea name="heroIntro" placeholder="Encuentra repuestos..." data-preview rows="3" style="resize: vertical;"></textarea>
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label style="font-size: 12px; color: var(--muted); text-transform: uppercase;">Texto del Botón</label>
                            <input name="heroButton" type="text" placeholder="Buscar repuestos" data-preview>
                        </div>
                    </div>
                    
                    <!-- Destacados -->
                    <div class="admin-section" style="margin-bottom: 20px; padding: 1.5rem;">
                        <h3 style="margin-bottom: 1.2rem; font-size: 18px; border-bottom: 1px solid var(--line); padding-bottom: 8px;">Sección Destacados</h3>
                        <div class="form-group">
                            <label style="font-size: 12px; color: var(--muted); text-transform: uppercase;">Etiqueta superior</label>
                            <input name="featuredEyebrow" type="text" data-preview>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 12px; color: var(--muted); text-transform: uppercase;">Título de sección</label>
                            <input name="featuredTitle" type="text" data-preview style="font-weight: bold;">
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label style="font-size: 12px; color: var(--muted); text-transform: uppercase;">Subtítulo</label>
                            <textarea name="featuredIntro" data-preview rows="2"></textarea>
                        </div>
                    </div>
                    
                    <!-- Beneficios -->
                    <div class="admin-section" style="margin-bottom: 20px; padding: 1.5rem;">
                        <h3 style="margin-bottom: 1.2rem; font-size: 18px; border-bottom: 1px solid var(--line); padding-bottom: 8px;">Puntos de Confianza</h3>
                        
                        <div style="margin-bottom: 15px; padding: 12px; background: var(--ice); border-radius: 6px;">
                            <div class="form-group" style="margin-bottom: 8px;">
                                <input name="trust0Title" type="text" placeholder="Título (Ej: Compra protegida)" data-preview style="font-weight: 600;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <input name="trust0Text" type="text" placeholder="Descripción breve" data-preview style="font-size: 13px;">
                            </div>
                        </div>

                        <div style="margin-bottom: 15px; padding: 12px; background: var(--ice); border-radius: 6px;">
                            <div class="form-group" style="margin-bottom: 8px;">
                                <input name="trust1Title" type="text" placeholder="Título (Ej: Calidad garantizada)" data-preview style="font-weight: 600;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <input name="trust1Text" type="text" placeholder="Descripción breve" data-preview style="font-size: 13px;">
                            </div>
                        </div>

                        <div style="padding: 12px; background: var(--ice); border-radius: 6px;">
                            <div class="form-group" style="margin-bottom: 8px;">
                                <input name="trust2Title" type="text" placeholder="Título (Ej: Soporte experto)" data-preview style="font-weight: 600;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <input name="trust2Text" type="text" placeholder="Descripción breve" data-preview style="font-size: 13px;">
                            </div>
                        </div>
                    </div>
                    
                    <button type="button" id="cms-save" class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 15px; box-shadow: 0 4px 12px rgba(244,123,32,0.2);">Guardar y Publicar</button>
                </form>
            </div>
            
            <div style="flex: 1; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 8px 30px rgba(0,0,0,0.06); display: flex; flex-direction: column;">
                <div style="background: #f8fafc; border-bottom: 1px solid var(--line); padding: 12px 20px; display: flex; align-items: center; gap: 10px;">
                    <div style="display:flex; gap:6px;">
                        <div style="width:12px; height:12px; border-radius:50%; background:#ef4444;"></div>
                        <div style="width:12px; height:12px; border-radius:50%; background:#f59e0b;"></div>
                        <div style="width:12px; height:12px; border-radius:50%; background:#10b981;"></div>
                    </div>
                    <div style="flex: 1; text-align: center; font-size: 12px; font-family: monospace; color: var(--muted); background: #fff; padding: 4px 12px; border-radius: 4px; border: 1px solid var(--line); margin: 0 20px;">
                        autopartespro.cl (Vista Previa)
                    </div>
                </div>
                <iframe id="preview-frame" src="/" style="width:100%; height:100%; border:0; flex:1; background: #fff;"></iframe>
            </div>
        </div>
    `;
    
    const editorPanel = document.querySelector('[data-panel="editor"]');
    if (editorPanel) {
        editorPanel.append(cms);
    } else {
        const main = document.querySelector('main');
        if (main) main.append(cms);
    }

    const form = document.getElementById('site-form');
    const iframe = document.getElementById('preview-frame');
    if (!form || !iframe) return;

    // Load config
    api('/api/site-config').then(conf => {
        if (!conf) return;
        Object.keys(conf).forEach(k => {
            if (k === 'trust' && Array.isArray(conf[k])) {
                conf[k].forEach((t, i) => {
                    if (form[`trust${i}Title`]) form[`trust${i}Title`].value = t.title || '';
                    if (form[`trust${i}Text`]) form[`trust${i}Text`].value = t.text || '';
                });
            } else if (form[k]) {
                form[k].value = conf[k];
            }
        });
    }).catch(() => {});

    function getFormData() {
        const fd = new FormData(form);
        const data = Object.fromEntries(fd.entries());
        
        data.trust = [0, 1, 2].map(i => ({
            title: data[`trust${i}Title`] || '',
            text: data[`trust${i}Text`] || '',
            icon: 'check-circle'
        }));
        
        Object.keys(data).forEach(k => {
            if (k.startsWith('trust') && k !== 'trust') delete data[k];
        });
        
        return data;
    }

    form.addEventListener('input', e => {
        if (!e.target.hasAttribute('data-preview')) return;
        if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'ap-preview', config: getFormData() }, location.origin);
        }
    });

    const saveBtn = document.getElementById('cms-save');
    if (saveBtn) {
        saveBtn.onclick = async () => {
            try {
                toggleLoader(true, 'Guardando configuración...');
                await api('/api/admin/site-config', {
                    method: 'PUT',
                    body: JSON.stringify(getFormData())
                });
                toggleLoader(false);
                showToast('Configuración del sitio guardada');
            } catch (e) {
                toggleLoader(false);
                alert('Error al guardar: ' + e.message);
            }
        };
    }
}

// Initialization
setupTabs();
load();
setTimeout(initCMS, 100);

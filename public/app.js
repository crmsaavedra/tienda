const state = { parts: [], cart: JSON.parse(localStorage.getItem('ap-cart') || '[]'), favorites: JSON.parse(localStorage.getItem('ap-favorites') || '[]'), coupon: localStorage.getItem('ap-coupon') || '', quote: null, page: 1, pages: 1, total: 0, sort: 'newest' };
const $ = s => document.querySelector(s), money = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);
async function api(url, options = {}) { const r = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(localStorage.apToken && { Authorization: `Bearer ${localStorage.apToken}` }), ...options.headers }, ...options }); const data = r.status === 204 ? null : await r.json(); if (!r.ok) throw new Error(data.error || 'No fue posible completar la operación'); return data; }
function persist() { localStorage.setItem('ap-cart', JSON.stringify(state.cart)); localStorage.setItem('ap-coupon', state.coupon); }
async function loadParts() { const q = $('#search').value, category = document.querySelector('.filters .selected').dataset.category, make = $('#make').value, model = $('#model').value; const data = await api('/api/parts?' + new URLSearchParams({ ...(q && { q }), ...(category && { category }), ...(make && { make }), ...(model && { model }), ...(state.sort !== 'newest' && { sort: state.sort }), page: state.page, limit: 6 })); state.parts = data.items; state.page = data.page; state.pages = data.pages; state.total = data.total; renderParts(); }
function renderParts() { 
  const card = p => {
    const isDiscount = p.discountPercent > 0;
    const finalPrice = isDiscount ? Math.round(p.price * (1 - p.discountPercent / 100)) : p.price;
    const priceDisplay = isDiscount 
      ? `<span class="price">${money(finalPrice)}</span> <span style="font-size:0.8em; text-decoration:line-through; color:#94a3b8; display:block; line-height:1;">${money(p.price)}</span>`
      : `<span class="price">${money(p.price)}</span><br>`;
    const badge = isDiscount ? `<div style="position:absolute; top:10px; left:10px; background:#ef4444; color:white; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:12px; z-index:1;">-${p.discountPercent}%</div>` : '';

    return `<article class="product" style="position:relative;">${badge}<button class="favorite ${state.favorites.includes(p._id) ? 'saved' : ''}" data-favorite="${p._id}" aria-label="Guardar ${p.name}">${state.favorites.includes(p._id) ? '♥' : '♡'}</button><img src="${p.image}" alt="${p.name}"><div class="product-body"><span class="part-meta">${p.brand} · ${p.sku}</span><h3>${p.name}</h3><p>${p.description}</p><a class="detail" href="/producto/${p._id}">Ver ficha técnica →</a><div class="price-row"><div>${priceDisplay}<span class="stock ${p.stock <= p.lowStockThreshold ? 'low' : ''}">${p.stock > 0 ? `${p.stock} disponibles` : 'Sin stock'}</span></div><button class="add" data-id="${p._id}" ${!p.stock ? 'disabled' : ''}>Agregar</button></div></div></article>`;
  }; 
  $('#products').innerHTML = state.parts.length ? state.parts.map(card).join('') : '<p>No encontramos repuestos con esos criterios.</p>'; $('#feedback').textContent = state.total ? `${state.total} repuesto${state.total === 1 ? '' : 's'} encontrado${state.total === 1 ? '' : 's'}` : ''; const pages = Array.from({ length: state.pages }, (_, i) => i + 1); $('#pagination').innerHTML = state.pages > 1 ? `<button data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>←</button>${pages.map(n => `<button data-page="${n}" class="${n === state.page ? 'current' : ''}" aria-current="${n === state.page ? 'page' : 'false'}">${n}</button>`).join('')}<button data-page="${state.page + 1}" ${state.page === state.pages ? 'disabled' : ''}>→</button>` : ''; const highlighted = [...state.parts].sort((a,b) => b.stock - a.stock).slice(0,3); const featured = $('#featured-products'); if (featured) featured.innerHTML = highlighted.map(card).join(''); $('#favorite-count').textContent = state.favorites.length; 
}
async function quote() { if (!state.cart.length) { state.quote = null; renderCart(); return; } try { state.quote = await api('/api/orders/quote', { method: 'POST', body: JSON.stringify({ items: state.cart.map(x => ({ partId: x.partId, qty: x.qty })), discountCode: state.coupon }) }); } catch (e) { state.quote = null; $('#feedback').textContent = e.message; } renderCart(); }
function renderCart() { $('#cart-count').textContent = state.cart.reduce((n, x) => n + x.qty, 0); $('#cart-items').innerHTML = state.cart.length ? state.cart.map(x => `<div class="cart-item"><div><strong>${x.name}</strong><br><small>${money(x.price)} c/u</small></div><div class="qty"><button data-qty="-1" data-id="${x.partId}">−</button><span>${x.qty}</span><button data-qty="1" data-id="${x.partId}">+</button></div></div>`).join('') : '<p class="feedback">Tu carrito está vacío.</p>'; const q = state.quote; $('#subtotal').textContent = money(q?.subtotal); $('#discount').textContent = '-' + money(q?.discount?.amount); $('#total').textContent = money(q?.total); $('#coupon').value = state.coupon; }
function add(id) { const p = state.parts.find(x => x._id === id); const item = state.cart.find(x => x.partId === id); if (item) { if (item.qty >= p.stock) return showToast('Ya agregaste el máximo disponible'); item.qty++; } else { const finalPrice = p.discountPercent > 0 ? Math.round(p.price * (1 - p.discountPercent / 100)) : p.price; state.cart.push({ partId: id, name: p.name, price: finalPrice, qty: 1 }); } persist(); quote(); showToast(`${p.name} agregado al carrito`); }
document.addEventListener('click', async e => { if (e.target.matches('.add')) add(e.target.dataset.id); if (e.target.matches('[data-favorite]')) { const id = e.target.dataset.favorite; state.favorites = state.favorites.includes(id) ? state.favorites.filter(x => x !== id) : [...state.favorites, id]; localStorage.setItem('ap-favorites', JSON.stringify(state.favorites)); renderParts(); showToast(state.favorites.includes(id) ? 'Guardado en favoritos' : 'Eliminado de favoritos'); } if (e.target.matches('[data-page]')) { state.page = Number(e.target.dataset.page); loadParts(); document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' }); } if (e.target.matches('[data-qty]')) { const x = state.cart.find(i => i.partId === e.target.dataset.id); x.qty += Number(e.target.dataset.qty); if (x.qty < 1) state.cart = state.cart.filter(i => i !== x); persist(); quote(); } });
$('#open-cart').onclick = () => { $('#cart').classList.add('open'); $('#overlay').classList.add('open'); $('#cart').setAttribute('aria-hidden', 'false'); }; const closeCart = () => { $('#cart').classList.remove('open'); $('#overlay').classList.remove('open'); }; $('#close-cart').onclick = closeCart; $('#overlay').onclick = closeCart;
$('#apply-coupon').onclick = () => { state.coupon = $('#coupon').value.trim().toUpperCase(); persist(); quote(); }; $('#search').oninput = () => { state.page = 1; clearTimeout(window.searchTimer); window.searchTimer = setTimeout(loadParts, 250); }; $('#filters').onclick = e => { if (!e.target.dataset.category && e.target.dataset.category !== '') return; document.querySelector('.filters .selected').classList.remove('selected'); e.target.classList.add('selected'); state.page = 1; loadParts(); }; $('#vehicle-form').onsubmit = e => { e.preventDefault(); state.page = 1; loadParts(); document.querySelector('#catalogo').scrollIntoView(); };
$('#checkout').onclick = () => { if (!state.cart.length) return; window.location.href = '/checkout'; };

function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => toast.classList.remove('show'), 2200); }
function applySiteConfig(c) { if (!c) return; const set = (selector, value) => { const el = $(selector); if (el && value) el.textContent = value; }; set('.hero .eyebrow', c.heroEyebrow); set('.hero h1', c.heroTitle); set('.hero .intro', c.heroIntro); set('.hero .primary', c.heroButton); set('.featured .eyebrow', c.featuredEyebrow); set('.featured h2', c.featuredTitle); set('.featured-copy', c.featuredIntro); if (c.primaryColor) document.documentElement.style.setProperty('--orange', c.primaryColor); if (c.secondaryColor) document.documentElement.style.setProperty('--blue', c.secondaryColor); (c.trust || []).forEach((item, i) => { const slot = document.querySelectorAll('.trust span')[i]; if (slot) { slot.replaceChildren(); const title = document.createElement('strong'); title.textContent = item.title; slot.append(title, document.createTextNode(item.text)); } }); }
fetch('/api/site-config').then(r => r.ok ? r.json() : null).then(applySiteConfig).catch(() => {}); window.addEventListener('message', event => { if (event.origin === location.origin && event.data?.type === 'ap-preview') applySiteConfig(event.data.config); });
function details(id) { 
  const p = state.parts.find(x => x._id === id); 
  const isDiscount = p.discountPercent > 0;
  const finalPrice = isDiscount ? Math.round(p.price * (1 - p.discountPercent / 100)) : p.price;
  const priceDisplay = isDiscount 
    ? `<strong class="price">${money(finalPrice)} <span style="font-size:0.7em; text-decoration:line-through; color:#94a3b8; font-weight:normal;">${money(p.price)}</span></strong>`
    : `<strong class="price">${money(p.price)}</strong>`;
  $('#product-detail').innerHTML = `<span class="part-meta">${p.brand} · ${p.sku}</span><h3>${p.name}</h3><img src="${p.image}" alt="${p.name}"><p>${p.description}</p><div class="specs">${p.technicalSpecs.map(s => `<span><b>${s.label}:</b> ${s.value}</span>`).join('')}<span><b>Compatibilidad:</b> ${p.compatibility.map(c => `${c.make} ${c.model} ${c.yearFrom}-${c.yearTo}`).join(', ') || 'Consultar'}</span></div>${priceDisplay}<button class="primary full" data-detail-add="${p._id}">Agregar al carrito</button>`; $('#product-modal').showModal(); 
}
document.addEventListener('click', e => { if (e.target.matches('[data-detail]')) details(e.target.dataset.detail); if (e.target.matches('[data-detail-add]')) { add(e.target.dataset.detailAdd); $('#product-modal').close(); } }); $('.product-close').onclick = () => $('#product-modal').close();
const toolsBar=document.createElement('div');toolsBar.className='catalog-tools';toolsBar.innerHTML=`<label>Ordenar<select id="sort-products"><option value="newest">Más recientes</option><option value="price_asc">Menor precio</option><option value="price_desc">Mayor precio</option><option value="name">Nombre A–Z</option></select></label><span class="favorite-summary">♥ <b id="favorite-count">0</b> favoritos guardados</span>`;document.querySelector('#filters').after(toolsBar);$('#sort-products').onchange=e=>{state.sort=e.target.value;state.page=1;loadParts()};
loadParts().catch(e => $('#feedback').textContent = e.message); quote();

// Scroll-reveal animation using IntersectionObserver
(function initScrollReveal() {
  const revealEls = document.querySelectorAll('.trust div, .section-head, .featured-copy');
  if (!('IntersectionObserver' in window)) {
    revealEls.forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    return;
  }
  revealEls.forEach((el, i) => {
    el.classList.add('reveal');
    if (i % 3 === 1) el.classList.add('reveal-delay-1');
    if (i % 3 === 2) el.classList.add('reveal-delay-2');
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => observer.observe(el));
})();

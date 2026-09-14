const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const CATEGORY_COLORS = {
  'frenos': '#b91c1c',
  'filtros': '#0369a1',
  'suspensión': '#7c3aed',
  'suspension': '#7c3aed',
  'electricidad': '#b45309',
  'eléctrico': '#b45309',
  'electrico': '#b45309',
  'lubricantes': '#92400e',
  'motor': '#374151',
  'transmisión': '#4338ca',
  'transmision': '#4338ca',
  'neumáticos': '#0f766e',
  'neumaticos': '#0f766e',
  'ruedas': '#0f766e',
  'refrigeración': '#0e7490',
  'refrigeracion': '#0e7490',
  'iluminación': '#1d4ed8',
  'iluminacion': '#1d4ed8',
  'accesorios': '#be185d',
  'ambiente': '#0e7490',
  'default': '#ea580c'
};

function escapeXml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(value) {
  return String(value == null ? 'PART' : value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'PART';
}

function categoryColor(category) {
  const key = String(category || '').toLowerCase().trim();
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.default;
}

function wrapText(text, maxChars) {
  const words = String(text || '').trim().split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxChars) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines.slice(0, 2) : [''];
}

function buildSvg(part) {
  const name = String(part.name || 'Repuesto');
  const brand = String(part.brand || '');
  const category = String(part.category || '');
  const color = categoryColor(category);

  const nameLines = wrapText(name, 26);
  const line1 = escapeXml(nameLines[0]);
  const line2 = nameLines[1] ? escapeXml(nameLines[1]) : '';

  const price = Number.isFinite(Number(part.price)) ? '$' + Number(part.price).toLocaleString('es-CL') : '';
  const initials = escapeXml(name.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase());

  const background = line2
    ? `  <text x="300" y="268" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="bold" fill="#ffffff" text-anchor="middle">${line1}</text>\n  <text x="300" y="304" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="bold" fill="#ffffff" text-anchor="middle">${line2}</text>`
    : `  <text x="300" y="286" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">${line1}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}"/>
      <stop offset="1" stop-color="#1f2937"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" fill="url(#bg)"/>
  <circle cx="450" cy="70" r="130" fill="#ffffff" opacity="0.06"/>
  <circle cx="110" cy="360" r="150" fill="#ffffff" opacity="0.06"/>
  <g transform="translate(300,135)" opacity="0.95">
    <circle r="72" fill="#ffffff" opacity="0.9"/>
    <circle r="72" fill="none" stroke="#ffffff" stroke-width="18" opacity="0.35"/>
    <rect x="-9" y="-96" width="18" height="72" rx="5" fill="#ffffff" opacity="0.5"/>
    <rect x="-9" y="24" width="18" height="72" rx="5" fill="#ffffff" opacity="0.5"/>
    <rect x="-96" y="-9" width="72" height="18" rx="5" fill="#ffffff" opacity="0.5"/>
    <rect x="24" y="-9" width="72" height="18" rx="5" fill="#ffffff" opacity="0.5"/>
    <g transform="rotate(45)">
      <rect x="-9" y="-96" width="18" height="72" rx="5" fill="#ffffff" opacity="0.35"/>
      <rect x="-9" y="24" width="18" height="72" rx="5" fill="#ffffff" opacity="0.35"/>
      <rect x="-96" y="-9" width="72" height="18" rx="5" fill="#ffffff" opacity="0.35"/>
      <rect x="24" y="-9" width="72" height="18" rx="5" fill="#ffffff" opacity="0.35"/>
    </g>
    <circle r="30" fill="${color}"/>
  </g>
  <text x="300" y="245" font-family="Arial, Helvetica, sans-serif" font-size="16" letter-spacing="4" fill="#ffffff" text-anchor="middle" opacity="0.85">${escapeXml(category.toUpperCase())}</text>
${background}
  <text x="300" y="354" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapeXml(price)}${brand ? '  ·  ' + escapeXml(brand) : ''}</text>
</svg>
`;
}

function buildBannerSvg(title) {
  const color = CATEGORY_COLORS.default;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="640" viewBox="0 0 1920 640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}"/>
      <stop offset="1" stop-color="#1f2937"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="640" fill="url(#bg)"/>
  <circle cx="1560" cy="120" r="360" fill="#ffffff" opacity="0.06"/>
  <circle cx="260" cy="560" r="420" fill="#ffffff" opacity="0.05"/>
  <text x="150" y="240" font-family="Arial, Helvetica, sans-serif" font-size="60" font-weight="bold" fill="#ffffff">${escapeXml(title || '')}</text>
  <text x="150" y="340" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#ffffff" opacity="0.9" letter-spacing="4">AUTO#PRO</text>
  <text x="150" y="400" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#ffffff" opacity="0.85" letter-spacing="2">REPUESTOS AUTOMOTRICES DE CALIDAD</text>
</svg>
`;
}

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function imageUrlFor(part) {
  ensureUploadsDir();
  const filename = `${slugify(part.sku || part.name)}.svg`;
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, buildSvg(part), 'utf8');
  }
  return `/uploads/${filename}`;
}

function bannerUrlFor(title, key) {
  ensureUploadsDir();
  const filename = `${slugify(key || 'banner')}.svg`;
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, buildBannerSvg(title), 'utf8');
  }
  return `/uploads/${filename}`;
}

module.exports = { imageUrlFor, bannerUrlFor, UPLOADS_DIR };
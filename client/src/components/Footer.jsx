import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useConfigStore } from '../store/store';

const FacebookIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const InstagramIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const TwitterIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
  </svg>
);

export default function Footer() {
  const { config } = useConfigStore();
  const socialLinks = [
    { label: 'Facebook', href: config?.socialFacebook, Icon: FacebookIcon },
    { label: 'Instagram', href: config?.socialInstagram, Icon: InstagramIcon },
    { label: 'X', href: config?.socialTwitter, Icon: TwitterIcon }
  ].filter(({ href }) => /^https?:\/\//i.test(href || ''));
  
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <span className="text-2xl font-black text-primary tracking-tighter mb-4 block">
              {config?.logoText1 || 'AUTO'}<span className="text-white">{config?.logoText2 || 'PRO'}</span>
            </span>
            <p className="text-sm text-slate-400">
              {config?.footerDescription || 'Encuentra los mejores repuestos con calidad certificada y el respaldo que tu vehículo merece.'}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-primary transition-colors">Inicio</Link></li>
              <li><Link to="/catalogo" className="hover:text-primary transition-colors">Catálogo</Link></li>
              <li><Link to="/login" className="hover:text-primary transition-colors">Mi Cuenta</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Contacto</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {config?.contactAddress || 'Av. Providencia 1234, Stgo'}</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> {config?.contactPhone || '+56 9 1234 5678'}</li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> {config?.contactEmail || 'contacto@autopartespro.cl'}</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Síguenos</h3>
            <div className="flex space-x-4">
              {socialLinks.length ? socialLinks.map(({ label, href, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="text-slate-400 hover:text-white transition-colors"><Icon className="w-5 h-5" /></a>
              )) : <span className="text-sm text-slate-500">Redes sociales próximamente.</span>}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-12 pt-8 text-sm text-center text-slate-500">
          &copy; {new Date().getFullYear()} {config?.logoText1 || 'AUTO'}{config?.logoText2 || 'PRO'}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}

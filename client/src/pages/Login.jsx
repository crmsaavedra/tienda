import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/store';
import { Lock, Mail, User, KeyRound } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needs2fa, setNeeds2fa] = useState(false);
  const [otpKey, setOtpKey] = useState('');
  const [code, setCode] = useState('');

  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (needs2fa) {
        const res = await axios.post('/api/auth/login/2fa', { otpKey, code });
        login(res.data.token, res.data.user);
        navigate(res.data.user.role === 'admin' ? '/admin' : from);
        return;
      }
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await axios.post(endpoint, formData);
      if (res.data.needs2fa) {
        setNeeds2fa(true);
        setOtpKey(res.data.otpKey);
        return;
      }
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === 'admin' ? '/admin' : from);
    } catch (err) {
      setError(err.response?.data?.error || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900">
            {needs2fa ? 'Verificación en dos pasos' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            {needs2fa ? 'Ingresa el código de 6 dígitos de tu app de autenticación' : isLogin ? 'Ingresa a tu cuenta para continuar' : 'Únete a Autopartes Pro'}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {needs2fa ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Código 2FA</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    name="code" type="text" inputMode="numeric" maxLength={6} required autoFocus
                    value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-primary focus:border-primary sm:text-sm tracking-widest text-center text-lg"
                    placeholder="000000"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setNeeds2fa(false); setOtpKey(''); setCode(''); setError(''); }}
                  className="mt-3 text-sm text-primary hover:text-orange-600 font-medium"
                >
                  ← Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <>
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    name="name" type="text" required={!isLogin}
                    value={formData.name} onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="Juan Pérez"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  name="email" type="email" required
                  value={formData.email} onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="tu@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  name="password" type="password" required minLength={8}
                  value={formData.password} onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
              </>
            )}
          </div>

          <div>
            <button
              type="submit" disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                needs2fa ? 'Verificar código' : isLogin ? 'Ingresar' : 'Registrarse'
              )}
            </button>
          </div>
        </form>
        
        {!needs2fa && (
        <div className="text-center mt-4">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-sm text-primary hover:text-orange-600 font-medium"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}

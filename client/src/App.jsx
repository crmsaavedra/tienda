import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import axios from 'axios'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore, useConfigStore } from './store/store'

const Home = lazy(() => import('./pages/Home'))
const Catalog = lazy(() => import('./pages/Catalog'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Login = lazy(() => import('./pages/Login'))
const Profile = lazy(() => import('./pages/Profile'))
const Favorites = lazy(() => import('./pages/Favorites'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminProductEditor = lazy(() => import('./pages/admin/AdminProductEditor'))
const AdminOrderDetail = lazy(() => import('./pages/admin/AdminOrderDetail'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))
const PaymentFailure = lazy(() => import('./pages/PaymentFailure'))
const PaymentPending = lazy(() => import('./pages/PaymentPending'))

function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="flex-grow flex flex-col"
    >
      {children}
    </motion.div>
  );
}

const LoadingFallback = () => (
  <div className="flex h-[60vh] items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#009ee3]"></div>
  </div>
);

function App() {
  const location = useLocation();
  const { setConfig } = useConfigStore();

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401 && err.config && !String(err.config.url || '').includes('/api/auth/')) {
          const auth = useAuthStore.getState();
          if (auth.token) {
            auth.logout();
            window.location.href = '/login';
          }
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(config => {
        setConfig(config);
        if (config.primaryColor) {
          document.documentElement.style.setProperty('--color-primary', config.primaryColor);
        }
      })
      .catch(console.error);
  }, [setConfig]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-grow flex flex-col">
        <AnimatePresence mode="wait">
          <Suspense fallback={<LoadingFallback />}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
              <Route path="/catalogo" element={<PageWrapper><Catalog /></PageWrapper>} />
              <Route path="/producto/:id" element={<PageWrapper><ProductDetail /></PageWrapper>} />
              <Route path="/favoritos" element={<PageWrapper><Favorites /></PageWrapper>} />
              <Route path="/checkout" element={<PageWrapper><Checkout /></PageWrapper>} />
              <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
              <Route path="/perfil" element={<ProtectedRoute adminOnly={false}><PageWrapper><Profile /></PageWrapper></ProtectedRoute>} />
              <Route path="/pago/exito" element={<PageWrapper><PaymentSuccess /></PageWrapper>} />
              <Route path="/pago/fallo" element={<PageWrapper><PaymentFailure /></PageWrapper>} />
              <Route path="/pago/pendiente" element={<PageWrapper><PaymentPending /></PageWrapper>} />
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <PageWrapper>
                      <Routes>
                        <Route path="/" element={<AdminDashboard />} />
                        <Route path="/productos/:id" element={<AdminProductEditor />} />
                        <Route path="/ordenes/:id" element={<AdminOrderDetail />} />
                      </Routes>
                    </PageWrapper>
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </main>
      <Footer />
      <Toaster position="bottom-right" />
    </div>
  )
}

export default App

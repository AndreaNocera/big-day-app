import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import ScrollToTop from '@/components/ScrollToTop';
import BottomNav from '@/components/BottomNav';
import Home from '@/pages/Home';
import Auth from '@/pages/Auth';
import Location from '@/pages/Location';
import Faq from '@/pages/Faq';
import Rsvp from '@/pages/Rsvp';
import Photos from '@/pages/Photos';
import Travel from '@/pages/Travel';
import Honeymoon from '@/pages/Honeymoon';
import AdminDashboard from '@/pages/AdminDashboard';
import { useAuthStore } from '@/store/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { token, _hasHydrated } = useAuthStore();
    if (!_hasHydrated) return null;
    if (!token) return <Navigate to="/accedi" replace />;
    return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
    const { token, isAdmin, _hasHydrated } = useAuthStore();
    if (!_hasHydrated) return null;
    if (!token) return <Navigate to="/accedi" replace />;
    if (!isAdmin) return <Navigate to="/" replace />;
    return <>{children}</>;
}

function SearchRedirect({ to }: { to: string }) {
    const [searchParams] = useSearchParams();
    return <Navigate to={`${to}?${searchParams.toString()}`} replace />;
}

export default function App() {
    return (
        <div className="page-container">
            <ScrollToTop />
            <Header />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/accedi" element={<Auth />} />
                <Route path="/location" element={<Location />} />
                <Route path="/viaggio" element={<Travel />} />
                <Route path="/regalo" element={<Honeymoon />} />
                <Route path="/faq" element={<Faq />} />
                <Route
                    path="/rsvp"
                    element={
                        <ProtectedRoute>
                            <Rsvp />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/foto"
                    element={
                        <ProtectedRoute>
                            <Photos />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <AdminRoute>
                            <AdminDashboard />
                        </AdminRoute>
                    }
                />
                {/* Legacy redirects from the old Next.js paths */}
                <Route path="/area-riservata/rsvp" element={<SearchRedirect to="/rsvp" />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <BottomNav />
        </div>
    );
}

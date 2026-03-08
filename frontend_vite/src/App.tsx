import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import Home from '@/pages/Home';
import Auth from '@/pages/Auth';
import Location from '@/pages/Location';
import Programma from '@/pages/Programma';
import Faq from '@/pages/Faq';
import Rsvp from '@/pages/Rsvp';
import Profilo from '@/pages/Profilo';
import { useAuthStore } from '@/store/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { token, _hasHydrated } = useAuthStore();
    if (!_hasHydrated) return null; // wait for hydration
    if (!token) return <Navigate to="/accedi" replace />;
    return <>{children}</>;
}

export default function App() {
    return (
        <div className="page-container">
            <Header />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/accedi" element={<Auth />} />
                <Route path="/location" element={<Location />} />
                <Route path="/programma" element={<Programma />} />
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
                    path="/profilo"
                    element={
                        <ProtectedRoute>
                            <Profilo />
                        </ProtectedRoute>
                    }
                />
                {/* Legacy redirects from the old Next.js paths */}
                <Route path="/auth" element={<Navigate to="/accedi" replace />} />
                <Route path="/area-riservata/rsvp" element={<Navigate to="/rsvp" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

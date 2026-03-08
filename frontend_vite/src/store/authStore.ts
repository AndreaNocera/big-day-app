import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    token: string | null;
    guestName: string | null;
    rsvpCompleted: boolean;
    _hasHydrated: boolean;
    setAuth: (token: string, name: string) => void;
    setRsvpCompleted: (v: boolean) => void;
    logout: () => void;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            guestName: null,
            rsvpCompleted: false,
            _hasHydrated: false,
            setAuth: (token, name) => set({ token, guestName: name }),
            setRsvpCompleted: (v) => set({ rsvpCompleted: v }),
            logout: () => set({ token: null, guestName: null, rsvpCompleted: false }),
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'wedding-auth-storage',
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);

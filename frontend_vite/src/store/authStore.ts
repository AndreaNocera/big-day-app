import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    token: string | null;
    guestName: string | null;
    isAdmin: boolean;
    isPhotoGuest: boolean;
    rsvpCompleted: boolean;
    _hasHydrated: boolean;
    setAuth: (token: string, name: string, isAdmin?: boolean, isPhotoGuest?: boolean) => void;
    setRsvpCompleted: (v: boolean) => void;
    logout: () => void;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            guestName: null,
            isAdmin: false,
            isPhotoGuest: false,
            rsvpCompleted: false,
            _hasHydrated: false,
            setAuth: (token, name, isAdmin = false, isPhotoGuest = false) => set({ token, guestName: name, isAdmin, isPhotoGuest }),
            setRsvpCompleted: (v) => set({ rsvpCompleted: v }),
            logout: () => set({ token: null, guestName: null, isAdmin: false, isPhotoGuest: false, rsvpCompleted: false }),
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

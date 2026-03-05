import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    token: string | null;
    guestName: string | null;
    setAuth: (token: string, name: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            guestName: null,
            setAuth: (token, name) => set({ token, guestName: name }),
            logout: () => set({ token: null, guestName: null }),
        }),
        {
            name: 'wedding-auth-storage',
        }
    )
);

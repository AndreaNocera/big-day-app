import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PhotoAccessState {
    /** Codice del link speciale foto, validato dal backend e persistito su localStorage. */
    photoCode: string | null;
    _hasHydrated: boolean;
    setPhotoCode: (code: string) => void;
    clearPhotoCode: () => void;
    setHasHydrated: (state: boolean) => void;
}

export const usePhotoAccessStore = create<PhotoAccessState>()(
    persist(
        (set) => ({
            photoCode: null,
            _hasHydrated: false,
            setPhotoCode: (code) => set({ photoCode: code }),
            clearPhotoCode: () => set({ photoCode: null }),
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'wedding-photo-access',
            partialize: (state) => ({ photoCode: state.photoCode }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);

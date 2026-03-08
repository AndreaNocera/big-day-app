import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { it } from '../locales/it';
import { en } from '../locales/en';
import { es } from '../locales/es';
import { fr } from '../locales/fr';

export type Language = 'it' | 'en' | 'es' | 'fr';

const dictionaries = { it, en, es, fr };
export type Dictionary = typeof it;

export const LANGUAGES = [
    { code: 'it' as Language, flag: '🇮🇹', label: 'Italiano' },
    { code: 'es' as Language, flag: '🇪🇸', label: 'Español' },
    { code: 'en' as Language, flag: '🇬🇧', label: 'English' },
    { code: 'fr' as Language, flag: '🇫🇷', label: 'Français' },
];

// Helper type for nested keys (e.g. 'nav.home')
export type NestedKeyOf<ObjectType extends object> = {
    [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

interface I18nState {
    language: Language;
    _hasHydrated: boolean;
    setLanguage: (lang: Language) => void;
    t: (key: NestedKeyOf<Dictionary>) => string;
    setHasHydrated: (state: boolean) => void;
}

export const useI18nStore = create<I18nState>()(
    persist(
        (set, get) => ({
            language: 'it',
            _hasHydrated: false,
            setLanguage: (lang) => set({ language: lang }),
            setHasHydrated: (state) => set({ _hasHydrated: state }),
            t: (key) => {
                const { language } = get();
                const dictionary = dictionaries[language];
                const keys = key.split('.');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let value: any = dictionary;
                for (const k of keys) {
                    if (value === undefined) return key;
                    value = value[k];
                }
                return (value as string) || key;
            },
        }),
        {
            name: 'wedding-i18n-storage',
            partialize: (state) => ({ language: state.language }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);

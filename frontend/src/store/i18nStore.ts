import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { it } from '../locales/it';
import { en } from '../locales/en';
import { es } from '../locales/es';
import { fr } from '../locales/fr';

export type Language = 'it' | 'en' | 'es' | 'fr';

const dictionaries = { it, en, es, fr };

export type Dictionary = typeof it;

// Helper type to get nested keys (like 'nav.home')
export type NestedKeyOf<ObjectType extends object> = {
    [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

interface I18nState {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: NestedKeyOf<Dictionary>) => string;
}

export const useI18nStore = create<I18nState>()(
    persist(
        (set, get) => ({
            language: 'it', // default
            setLanguage: (lang) => set({ language: lang }),
            t: (key) => {
                const { language } = get();
                const dictionary = dictionaries[language];
                const keys = key.split('.');

                let value: any = dictionary;
                for (const k of keys) {
                    if (value === undefined) return key;
                    value = value[k];
                }
                return value as string || key;
            }
        }),
        {
            name: 'wedding-i18n-storage',
            partialize: (state) => ({ language: state.language }),
            skipHydration: true,
        }
    )
);

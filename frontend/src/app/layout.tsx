"use client";

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useI18nStore } from '@/store/i18nStore';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useEffect, useState } from 'react';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { guestName, logout } = useAuthStore();
  const { t, language, setLanguage } = useI18nStore();
  const [mounted, setMounted] = useState(false);

  // Evita errori di idratazione (hydration mismatch) con Zustand persistito
  useEffect(() => {
    const handleRehydrate = async () => {
      await useI18nStore.persist.rehydrate();

      // Se non c'è una lingua salvata, prova a rilevarla dal browser
      if (!localStorage.getItem('wedding-i18n-storage')) {
        const browserLang = navigator.language.split('-')[0] as any;
        if (['it', 'en', 'es', 'fr'].includes(browserLang)) {
          setLanguage(browserLang);
        }
      }
      setMounted(true);
    };

    handleRehydrate();
  }, [setLanguage]);

  return (
    <html lang={language} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-sans">
        <header className="border-b bg-background sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tighter text-primary">
              A & E
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/" className="hover:text-primary transition-colors">{t('nav.home')}</Link>
              <Link href="/location" className="hover:text-primary transition-colors">{t('nav.location')}</Link>
              <Link href="/programma" className="hover:text-primary transition-colors">{t('nav.program')}</Link>
              <Link href="/faq" className="hover:text-primary transition-colors">{t('nav.faq')}</Link>

              <div className="border-l pl-6 ml-2 flex items-center gap-4">
                {mounted && (
                  <>
                    <LanguageSwitcher />

                    {guestName ? (
                      <div className="flex items-center gap-4">
                        <Link href="/area-riservata/rsvp" className="text-primary hover:underline">{t('nav.reservedArea')}</Link>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">Ciao, {guestName}</span>
                          <Button variant="outline" size="sm" onClick={logout}>{t('nav.logout')}</Button>
                        </div>
                      </div>
                    ) : (
                      <Link href="/auth">
                        <Button variant="default" size="sm">{t('nav.login')}</Button>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </nav>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>

        <footer className="border-t py-8 bg-muted/50">
          <div className="container text-center text-sm text-muted-foreground">
            <p>{t('home.date')}</p>
            <p className="mt-2 text-xs">{t('footer.madeWith')}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { EmailForm } from "./EmailForm";

export default function AreaRiservataLayout({ children }: { children: React.ReactNode }) {
    const { token, _hasHydrated: authHydrated } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (authHydrated && !token) {
            router.push("/auth");
        }
    }, [token, authHydrated, router]);

    if (!authHydrated) return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (!token) return null;

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <h1 className="text-3xl font-serif text-primary mb-8 border-b pb-4">Area Riservata</h1>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Nav */}
                <nav className="flex md:flex-col gap-4 overflow-x-auto pb-4 md:pb-0 md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-border md:pr-4">
                    <Link href="/area-riservata/rsvp/" className="text-foreground hover:text-primary whitespace-nowrap font-medium transition-colors">
                        1. RSVP
                    </Link>
                    <Link href="/area-riservata/sondaggio/" className="text-foreground hover:text-primary whitespace-nowrap font-medium transition-colors">
                        2. Sondaggio
                    </Link>
                    <Link href="/area-riservata/foto/" className="text-foreground hover:text-primary whitespace-nowrap font-medium transition-colors">
                        3. Galleria Foto
                    </Link>
                </nav>

                {/* Content */}
                <div className="flex-1 flex flex-col gap-6 min-w-0">
                    <div className="bg-card rounded-lg border p-6 shadow-sm overflow-hidden min-w-0">
                        {children}
                    </div>

                    <div className="bg-muted/30 rounded-lg p-6 border shadow-sm mt-4">
                        <h3 className="text-lg font-medium mb-1 text-card-foreground">Restiamo in contatto</h3>
                        <p className="text-sm text-muted-foreground mb-4">Aggiungi la tua email per ricevere notifiche e le foto dell'evento (facoltativo).</p>
                        <EmailForm />
                    </div>
                </div>
            </div>
        </div>
    );
}

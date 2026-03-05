"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export default function AreaRiservataLayout({ children }: { children: React.ReactNode }) {
    const { token } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!token) {
            router.push("/auth");
        }
    }, [token, router]);

    if (!token) return null;

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <h1 className="text-3xl font-serif text-primary mb-8 border-b pb-4">Area Riservata</h1>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Nav */}
                <nav className="flex md:flex-col gap-4 overflow-x-auto pb-4 md:pb-0 md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-border md:pr-4">
                    <Link href="/area-riservata/rsvp" className="text-foreground hover:text-primary whitespace-nowrap font-medium transition-colors">
                        1. RSVP
                    </Link>
                    <Link href="/area-riservata/sondaggio" className="text-foreground hover:text-primary whitespace-nowrap font-medium transition-colors">
                        2. Sondaggio
                    </Link>
                    <Link href="/area-riservata/foto" className="text-foreground hover:text-primary whitespace-nowrap font-medium transition-colors">
                        3. Galleria Foto
                    </Link>
                </nav>

                {/* Content */}
                <div className="flex-1 bg-card rounded-lg border p-6 shadow-sm">
                    {children}
                </div>
            </div>
        </div>
    );
}

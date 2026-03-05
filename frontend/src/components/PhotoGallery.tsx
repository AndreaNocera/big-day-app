"use client";

import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';

interface Photo {
    PK: string;
    s3Key: string;
    url: string;
}

export default function PhotoGallery({ refreshTrigger }: { refreshTrigger?: number }) {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPhotos = async () => {
            setLoading(true);
            try {
                const { fetchWithAuth } = await import('@/lib/api');
                const data = await fetchWithAuth('/photos');
                setPhotos(data.photos || []);
            } catch (err: any) {
                console.error("Errore fetch photos:", err);
                setError(err.message || "Errore nel caricamento delle foto");
            } finally {
                setLoading(false);
            }
        };

        fetchPhotos();
    }, [refreshTrigger]);

    if (loading && photos.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse bg-muted/10 rounded-xl border-2 border-dashed">
            <Globe className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">Caricamento galleria...</p>
        </div>
    );

    if (error) return (
        <div className="text-center py-12 px-6 border-2 border-destructive/20 rounded-xl bg-destructive/5 text-destructive">
            <p className="font-semibold text-lg">Ops! Qualcosa è andato storto</p>
            <p className="text-sm mt-1 opacity-90">{error}</p>
        </div>
    );

    if (photos.length === 0) return (
        <div className="flex flex-col items-center justify-center text-center py-24 px-6 border-2 border-dashed rounded-2xl bg-gray-50/50 border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm border mb-6">
                <Globe className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Ancora nessuna foto</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-3 leading-relaxed">
                Questa galleria aspetta solo i tuoi ricordi! Sii il primo a condividere un momento speciale caricando una foto qui sopra.
            </p>
        </div>
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-8">
            {photos.map((p) => (
                <div key={p.PK} className="group relative aspect-square bg-muted rounded-xl overflow-hidden border shadow-sm transition-all hover:shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={p.url}
                        alt="Wedding photo"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                            // Only hide this specific image container if it fails to load
                            const target = e.target as HTMLImageElement;
                            const parent = target.closest('.group');
                            if (parent) {
                                parent.classList.add('hidden');
                            }
                        }}
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
            ))}
        </div>
    );
}

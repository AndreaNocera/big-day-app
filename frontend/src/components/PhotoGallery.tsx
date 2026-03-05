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
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground animate-pulse">
            <Globe className="h-8 w-8 mb-2 opacity-20" />
            <p>Caricamento galleria...</p>
        </div>
    );

    if (error) return (
        <div className="text-center py-12 px-4 border rounded-lg bg-destructive/5 text-destructive">
            <p className="font-medium">Ops! Qualcosa è andato storto</p>
            <p className="text-sm opacity-80">{error}</p>
        </div>
    );

    if (photos.length === 0) return (
        <div className="text-center py-16 px-4 border-2 border-dashed rounded-xl bg-muted/30">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Ancora nessuna foto</h3>
            <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                Sii il primo a condividere un ricordo di questa splendida giornata! Carica la tua foto sopra.
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
                        onError={(e) => {
                            // If image fails to load (e.g. deleted from MinIO), hide the container or show a simpler placeholder
                            (e.target as HTMLImageElement).parentElement?.classList.add('hidden');
                        }}
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
            ))}
        </div>
    );
}

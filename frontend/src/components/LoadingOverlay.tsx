"use client";

import { useLoadingStore } from "@/store/loadingStore";
import { Spinner } from "@/components/ui/spinner";

export function LoadingOverlay() {
    const isLoading = useLoadingStore((s) => s.isLoading);

    if (!isLoading) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label="Caricamento in corso"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/70 backdrop-blur-sm"
        >
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground animate-pulse">Caricamento...</p>
        </div>
    );
}

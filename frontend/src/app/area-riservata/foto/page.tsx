"use client";

import { useState } from 'react';
import PhotoGallery from "@/components/PhotoGallery";
import PhotoUpload from "@/components/PhotoUpload";

export default function FotoPage() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleUploadSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="space-y-12">
            <div>
                <h2 className="text-2xl font-semibold mb-2">Galleria Foto</h2>
                <p className="text-muted-foreground">Condividi con noi i tuoi scatti migliori della giornata!</p>
            </div>

            <div className="max-w-md">
                <PhotoUpload onUploadSuccess={handleUploadSuccess} />
            </div>

            <div className="pt-8 border-t">
                <h3 className="text-xl font-medium mb-4">Le foto degli ospiti</h3>
                <PhotoGallery refreshTrigger={refreshTrigger} />
            </div>
        </div>
    );
}

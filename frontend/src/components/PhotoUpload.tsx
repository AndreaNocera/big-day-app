"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { getApiUrl } from '@/lib/api';
import { useLoadingStore } from '@/store/loadingStore';

export default function PhotoUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { setLoading: setGlobalLoading } = useLoadingStore();

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setGlobalLoading(true);
        setError(null);

        try {
            const { fetchWithAuth } = await import('@/lib/api');

            // 1. Get presigned URL
            const data = await fetchWithAuth('/upload/url', {
                method: 'POST',
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type
                })
            });

            let uploadUrl = data.uploadUrl;

            // In locale, fix the minio host if using docker desktop from host
            if (process.env.NODE_ENV === 'development' && uploadUrl.includes('minio:9000')) {
                uploadUrl = uploadUrl.replace('minio:9000', 'localhost:9000');
            }

            // 2. Upload to S3/MinIO
            const resUpload = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file
            });

            if (!resUpload.ok) throw new Error('Errore durante il caricamento');

            setFile(null);
            if (onUploadSuccess) onUploadSuccess();

            alert('Foto caricata con successo!');

        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Errore sconosciuto");
            }
        } finally {
            setUploading(false);
            setGlobalLoading(false);
        }
    };

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-card text-card-foreground">
            <h3 className="font-semibold text-lg">Condividi una foto</h3>
            <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={uploading}
            />
            <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full"
            >
                {uploading ? 'Caricamento...' : 'Carica Foto'}
            </Button>
            {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
    );
}

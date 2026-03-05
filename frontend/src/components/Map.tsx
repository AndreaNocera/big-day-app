"use client";

import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
    lng: number;
    lat: number;
    zoom?: number;
}

export default function Map({ lng, lat, zoom = 14 }: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [token] = useState(process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '');

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        if (!token) {
            console.warn("Mapbox token mancante");
            return;
        }

        mapboxgl.accessToken = token;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [lng, lat],
            zoom: zoom
        });

        new mapboxgl.Marker({ color: '#E11D48' }) // primary color
            .setLngLat([lng, lat])
            .addTo(map.current);

    }, [lng, lat, zoom, token]);

    if (!token) {
        return <div className="w-full h-[400px] bg-muted flex items-center justify-center rounded-lg border">Mappa non disponibile (Manca token)</div>
    }

    return (
        <div className="w-full h-[400px] rounded-lg overflow-hidden border">
            <div ref={mapContainer} className="w-full h-full" />
        </div>
    );
}

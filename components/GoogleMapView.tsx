'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Info, ExternalLink } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type { CheckInPoint } from '@/components/LiveMap';

const LiveMap = dynamic(() => import('@/components/LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800/50 text-xs text-slate-500 p-4 text-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
      <span className="font-medium">Carregando mapa...</span>
    </div>
  )
});

export interface MapMarkerItem {
  id: string | number;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  description?: string;
  status?: string;
  badge?: string;
  badgeColor?: string;
  linkUrl?: string;
  data?: any;
}

interface GoogleMapViewProps {
  markers?: MapMarkerItem[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string | number;
  className?: string;
  selectedMarkerId?: string | number | null;
  onSelectMarker?: (marker: MapMarkerItem | null) => void;
  showControls?: boolean;
}

export default function GoogleMapView({
  markers = [],
  center,
  zoom = 12,
  height = '450px',
  className = '',
  selectedMarkerId = null,
  onSelectMarker,
  showControls = true
}: GoogleMapViewProps) {
  const { mapsApiKey, isDarkMode, hasBillingError: themeBillingError, setHasBillingError: setThemeBillingError } = useTheme();
  const [activeMarker, setActiveMarker] = useState<MapMarkerItem | null>(null);

  const rawKey = mapsApiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const effectiveApiKey = rawKey === 'AIzaSyCTfBfDPDjif_Es8txvqsLsjXvH9G8TjrY' ? '' : rawKey;
  const [hasBillingError, setHasBillingError] = useState(false);
  const isBillingError = hasBillingError || themeBillingError;

  // Default coordinates (João Pessoa / Paraíba)
  const defaultCenter = center || (
    markers.length > 0 && typeof markers[0].lat === 'number' && typeof markers[0].lng === 'number'
      ? { lat: markers[0].lat, lng: markers[0].lng }
      : { lat: -7.1150, lng: -34.8631 }
  );

  useEffect(() => {
    if (selectedMarkerId) {
      const found = markers.find(m => String(m.id) === String(selectedMarkerId));
      if (found) {
        setActiveMarker(found);
      }
    }
  }, [selectedMarkerId, markers]);

  if (!effectiveApiKey || isBillingError) {
    const fallbackPoints: CheckInPoint[] = markers.map(m => ({
      id: String(m.id),
      title: m.title,
      checkin_lat: m.lat,
      checkin_lng: m.lng,
      checkin_at: new Date().toISOString(),
      collaborator_name: m.badge || m.status || 'Localização',
      source: 'delivery',
      address: m.subtitle || m.description,
    }));

    return (
      <div 
        style={{ height }} 
        className={`relative w-full rounded-3xl overflow-hidden border shadow-sm [&>#map]:h-full [&>#map]:rounded-none [&>#map]:border-0 ${
          isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
        } ${className}`}
      >
        <LiveMap points={fallbackPoints} />
      </div>
    );
  }

  return (
    <div 
      style={{ height }} 
      className={`relative w-full rounded-3xl overflow-hidden border shadow-sm ${
        isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
      } ${className}`}
    >
      <APIProvider 
        apiKey={effectiveApiKey}
        solutionChannel="gmp_mcp_codeassist_v1_aistudio"
        onError={() => {
          setHasBillingError(true);
          setThemeBillingError(true);
        }}
      >
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={zoom}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          gestureHandling="greedy"
          disableDefaultUI={!showControls}
          style={{ width: '100%', height: '100%' }}
        >
          {markers.map((marker) => {
            const isSelected = activeMarker?.id === marker.id;
            return (
              <AdvancedMarker
                key={String(marker.id)}
                position={{ lat: marker.lat, lng: marker.lng }}
                onClick={() => {
                  setActiveMarker(marker);
                  if (onSelectMarker) onSelectMarker(marker);
                }}
                title={marker.title}
              >
                <Pin 
                  background={marker.badgeColor || (isSelected ? '#2563eb' : '#ef4444')}
                  borderColor="#ffffff"
                  glyphColor="#ffffff"
                  scale={isSelected ? 1.25 : 1.0}
                />
              </AdvancedMarker>
            );
          })}

          {activeMarker && (
            <InfoWindow
              position={{ lat: activeMarker.lat, lng: activeMarker.lng }}
              onCloseClick={() => {
                setActiveMarker(null);
                if (onSelectMarker) onSelectMarker(null);
              }}
            >
              <div className="p-2 min-w-[200px] max-w-[260px] text-slate-900 font-sans">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-bold text-sm leading-tight text-slate-900">
                    {activeMarker.title}
                  </h4>
                  {activeMarker.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">
                      {activeMarker.badge}
                    </span>
                  )}
                </div>

                {activeMarker.subtitle && (
                  <p className="text-xs text-slate-600 mb-1.5 flex items-start gap-1">
                    <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />
                    <span>{activeMarker.subtitle}</span>
                  </p>
                )}

                {activeMarker.description && (
                  <p className="text-[11px] text-slate-500 mb-2">
                    {activeMarker.description}
                  </p>
                )}

                {activeMarker.linkUrl && (
                  <a
                    href={activeMarker.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <span>Ver detalhes</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}

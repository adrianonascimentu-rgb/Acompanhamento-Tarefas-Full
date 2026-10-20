'use client';

import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Info, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import dynamic from 'next/dynamic';

// Dynamic import for Leaflet fallback to avoid SSR issues
const LeafletFallbackMap = dynamic(() => import('./LeafletFallbackMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-slate-900/10 dark:bg-slate-900/50 animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs text-slate-500 font-medium">
      Carregando mapa interativo...
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
  const { mapsApiKey, isDarkMode } = useTheme();
  const [activeMarker, setActiveMarker] = useState<MapMarkerItem | null>(null);
  
  // Use user-provided key if available, otherwise check env
  const effectiveApiKey = mapsApiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const [hasBillingError, setHasBillingError] = useState(false);

  useEffect(() => {
    // Intercept Google Maps Auth & Billing Failures
    const handleAuthFailure = () => {
      console.warn('Google Maps Billing/Auth Failure detected. Switching to OpenStreetMap fallback.');
      setHasBillingError(true);
    };

    (window as any).gm_authFailure = handleAuthFailure;

    const handleWindowError = (event: ErrorEvent) => {
      if (
        event.message?.includes('BillingNotEnabledMapError') ||
        event.message?.includes('Google Maps JavaScript API error')
      ) {
        setHasBillingError(true);
      }
    };

    window.addEventListener('error', handleWindowError);
    return () => {
      window.removeEventListener('error', handleWindowError);
    };
  }, []);

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

  // If no effective key is configured or a Billing/Auth error occurred, fallback seamlessly to OpenStreetMap/Leaflet
  if (!effectiveApiKey || hasBillingError) {
    return (
      <div 
        style={{ height }}
        className={`relative w-full rounded-3xl overflow-hidden border shadow-sm ${
          isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
        } ${className}`}
      >
        {hasBillingError && (
          <div className="absolute top-3 left-3 right-3 z-[1000] p-3 bg-amber-500/95 backdrop-blur-md text-white rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs font-bold border border-amber-400/30">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-100 animate-pulse" />
              <span>Chave do Google Maps requer faturamento ativo no GCP. Exibindo mapa interativo de contingência.</span>
            </div>
            <a 
              href="https://console.cloud.google.com/billing" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="px-3 py-1 bg-white text-amber-800 rounded-xl hover:bg-amber-50 transition-all shrink-0 text-[11px] font-black uppercase tracking-wider"
            >
              Ativar Faturamento
            </a>
          </div>
        )}
        <LeafletFallbackMap
          markers={markers}
          center={defaultCenter}
          zoom={zoom}
          isDarkMode={isDarkMode}
          onSelectMarker={onSelectMarker}
        />
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
        onError={() => setHasBillingError(true)}
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

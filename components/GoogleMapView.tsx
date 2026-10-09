'use client';

import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Info, ExternalLink } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

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

  const effectiveApiKey = mapsApiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

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

  if (!effectiveApiKey) {
    return (
      <div 
        style={{ height }} 
        className={`w-full rounded-2xl flex flex-col items-center justify-center p-6 text-center border ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
        } ${className}`}
      >
        <MapPin size={40} className="text-blue-500 mb-3 animate-bounce" />
        <h3 className="font-bold text-base mb-1">Google Maps Platform</h3>
        <p className="text-xs max-w-md text-slate-500 mb-4">
          Para visualizar o mapa em alta definição, configure sua chave no menu de configurações do sistema.
        </p>
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

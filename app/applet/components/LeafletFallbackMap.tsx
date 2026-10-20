'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, ExternalLink, Info } from 'lucide-react';
import { MapMarkerItem } from './GoogleMapView';

interface LeafletFallbackProps {
  markers: MapMarkerItem[];
  center: { lat: number; lng: number };
  zoom: number;
  isDarkMode: boolean;
  onSelectMarker?: (marker: MapMarkerItem | null) => void;
}

const createCustomPin = (color: string) =>
  L.divIcon({
    className: 'custom-leaflet-marker-pin',
    html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%; transform: rotate(45deg);"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });

function MapViewController({ markers, center }: { markers: MapMarkerItem[]; center: { lat: number; lng: number } }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      const validMarkers = markers.filter(m => typeof m.lat === 'number' && typeof m.lng === 'number');
      if (validMarkers.length > 0) {
        const bounds = L.latLngBounds(validMarkers.map(m => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    } else {
      map.setView([center.lat, center.lng], 12);
    }

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 400);

    return () => clearTimeout(timer);
  }, [markers, center, map]);

  return null;
}

export default function LeafletFallbackMap({
  markers,
  center,
  zoom,
  isDarkMode,
  onSelectMarker
}: LeafletFallbackProps) {
  const validMarkers = markers.filter(
    m => typeof m.lat === 'number' && typeof m.lng === 'number' && !isNaN(m.lat) && !isNaN(m.lng)
  );

  return (
    <div className="w-full h-full relative">
      <MapContainer
        key={`leaflet-map-${validMarkers.length}-${isDarkMode ? 'dark' : 'light'}`}
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={
            isDarkMode
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
        />

        {validMarkers.map(m => (
          <Marker
            key={String(m.id)}
            position={[m.lat, m.lng]}
            icon={createCustomPin(m.badgeColor || '#2563eb')}
            eventHandlers={{
              click: () => {
                if (onSelectMarker) onSelectMarker(m);
              }
            }}
          >
            <Popup className="custom-leaflet-popup">
              <div className={`p-2.5 min-w-[200px] max-w-[250px] space-y-1.5 font-sans ${
                isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
              }`}>
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-xs truncate m-0">{m.title}</h4>
                  {m.badge && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0">
                      {m.badge}
                    </span>
                  )}
                </div>
                {m.subtitle && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 flex items-center gap-1">
                    <MapPin size={11} className="shrink-0 text-slate-400" />
                    <span className="truncate">{m.subtitle}</span>
                  </p>
                )}
                {m.description && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 leading-tight italic">
                    {m.description}
                  </p>
                )}
                {m.linkUrl && (
                  <a
                    href={m.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline pt-1"
                  >
                    <span>Ver detalhes</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        <MapViewController markers={validMarkers} center={center} />
      </MapContainer>

      {/* Floating total indicator */}
      <div className="absolute bottom-4 right-4 z-[500] px-3.5 py-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl flex items-center gap-2.5">
        <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
          {validMarkers.length} {validMarkers.length === 1 ? 'Ponto no mapa' : 'Pontos no mapa'}
        </span>
      </div>
    </div>
  );
}

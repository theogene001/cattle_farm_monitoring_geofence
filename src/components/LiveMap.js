import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import apiService from '../services/apiService';

// AnimatedMarker: smooth transitions when position prop changes
import { useEffect, useRef } from 'react';
import { Marker as LeafletMarker } from 'leaflet';
import { createPortal } from 'react-dom';

const AnimatedMarker = ({ position, icon, children }) => {
  const map = useMap();
  const markerRef = useRef(null);
  const animRef = useRef(null);
  const lastPosRef = useRef(position);

  useEffect(() => {
    if (!markerRef.current) {
      markerRef.current = new LeafletMarker(position, { icon });
      markerRef.current.addTo(map);
      lastPosRef.current = position;
    }

    const start = lastPosRef.current;
    const end = position;
    const duration = 800; // ms
    const startTime = performance.now();

    // cancel previous animation
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const lat = start[0] + (end[0] - start[0]) * t;
      const lng = start[1] + (end[1] - start[1]) * t;
      markerRef.current.setLatLng([lat, lng]);
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        lastPosRef.current = end;
        animRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [position, icon, map]);

  // Render children into a popup by attaching to marker
  useEffect(() => {
    if (!markerRef.current) return;
    if (!children) return;
    markerRef.current.bindPopup(() => {
      const container = document.createElement('div');
      // Render children into this container
      try { createPortal(children, container); } catch (e) { /* ignore portal failures here */ }
      return container;
    });
  }, [children]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        try { markerRef.current.remove(); } catch (e) { }
      }
    };
  }, []);

  return null; // marker is managed directly on the map
};

// Small helper to create a colored div icon
const createColorIcon = (color = '#3388ff') => {
  return L.divIcon({
    className: 'live-marker-icon',
    html: `<div style="background:${color}; width:14px; height:14px; border-radius:50%; border:2px solid white; box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
};

// Pick a color deterministically per animal id
const colorForId = (id) => {
  const colors = ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f'];
  if (!id && id !== 0) return colors[0];
  return colors[Math.abs(id) % colors.length];
};

// Convert backend location rows into a latest-by-animal map
const extractLatestPerAnimal = (rows) => {
  const latest = new Map();
  for (const r of rows) {
    const aid = r.animal_id || r.animalId || null;
    if (!aid) continue; // skip points not tied to animals
    if (!latest.has(aid)) {
      // assume rows are returned most-recent-first; first appearance is latest
      latest.set(aid, {
        id: r.id,
        animal_id: aid,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        speed_kmh: r.speed_kmh,
        battery_level: r.battery_level,
        timestamp: r.timestamp || r.recorded_at || r.created_at
      });
    }
  }
  return Array.from(latest.values());
};

const LiveMap = ({ center = [39.7817, -89.6501], zoom = 14, pollInterval = 5000, showFence = false, fenceRadius = 2000, virtualFences = [] }) => {
  const [points, setPoints] = useState([]);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    const fetchAndSet = async () => {
      try {
        const res = await apiService.getAnimalLocations();
        if (res && res.success && Array.isArray(res.data)) {
          const latest = extractLatestPerAnimal(res.data);
          if (mounted.current) setPoints(latest);
        }
      } catch (err) {
        console.error('LiveMap: failed to fetch locations', err);
      }
    };

    // initial fetch
    fetchAndSet();
    // poll as a fallback
    const id = setInterval(fetchAndSet, pollInterval);

    // Setup SSE to get immediate live updates
    let evtSource;
    try {
      const apiBaseEnv = process.env.REACT_APP_API_URL || '';
      const base = apiBaseEnv ? apiBaseEnv : (typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : 'http://localhost:5000/api/v1');
      const streamUrl = base.endsWith('/') ? `${base}gps/stream` : `${base}/gps/stream`;
      evtSource = new EventSource(streamUrl);
      evtSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (!data) return;
          // If this is an animal point, merge into latest set
          if (data.animal_id || data.animal_id === 0) {
            setPoints(prev => {
              const byId = new Map(prev.map(p => [p.animal_id, p]));
              byId.set(data.animal_id, {
                animal_id: data.animal_id,
                latitude: Number(data.latitude),
                longitude: Number(data.longitude),
                speed_kmh: data.speed_kmh,
                battery_level: data.battery_level,
                timestamp: data.recorded_at || data.timestamp
              });
              return Array.from(byId.values());
            });
          }
        } catch (err) {
          console.warn('LiveMap SSE parse error:', err);
        }
      };
      evtSource.onerror = (err) => {
        console.warn('LiveMap SSE error', err);
      };
    } catch (err) {
      console.warn('LiveMap: failed to open SSE stream', err);
    }

    return () => {
      mounted.current = false;
      clearInterval(id);
      if (evtSource) {
        try { evtSource.close(); } catch (e) { }
      }
    };
  }, [pollInterval]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <MapContainer center={center} zoom={zoom} style={{ width: '100%', height: '500px' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />

        {virtualFences && virtualFences.map((fence) => (
          <Circle
            key={`fence-${fence.id}`}
            center={[fence.center_latitude, fence.center_longitude]}
            radius={fence.radius_meters}
            pathOptions={{
              color: fence.is_active ? '#3CB371' : '#FF6B6B',
              fillColor: fence.is_active ? '#3CB371' : '#FF6B6B',
              fillOpacity: 0.08,
              weight: 2
            }}
          />
        ))}

        {points.map(p => (
          <AnimatedMarker
            key={p.animal_id}
            position={[p.latitude, p.longitude]}
            icon={createColorIcon(colorForId(p.animal_id))}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div><strong>Animal ID:</strong> {p.animal_id}</div>
                <div><strong>Time:</strong> {p.timestamp ? new Date(p.timestamp).toLocaleString() : '\u2014'}</div>
                <div><strong>Speed:</strong> {p.speed_kmh ?? '\u2014'} km/h</div>
                <div><strong>Battery:</strong> {p.battery_level ?? '\u2014'}%</div>
              </div>
            </Popup>
            <Tooltip direction='top' offset={[0, -8]} opacity={0.9}>
              <span>{`Animal ${p.animal_id}`}</span>
            </Tooltip>
          </AnimatedMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LiveMap;

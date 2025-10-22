import React, { useEffect, useState, useRef, useMemo } from 'react';
import { GoogleMap, Marker, Circle, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import apiService from '../services/apiService';

// Helper to pick a deterministic color per animal id
const colorForId = (id) => {
  const colors = ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f'];
  if (id === null || id === undefined) return colors[0];
  return colors[Math.abs(Number(id)) % colors.length];
};

const extractLatestPerAnimal = (rows) => {
  const latest = new Map();
  for (const r of rows) {
    const aid = r.animal_id || r.animalId || null;
    if (!aid && aid !== 0) continue;
    latest.set(aid, {
      animal_id: aid,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      speed_kmh: r.speed_kmh,
      battery_level: r.battery_level,
      timestamp: r.timestamp || r.recorded_at || r.created_at
    });
  }
  return Array.from(latest.values());
};

const GoogleLiveMap = ({ center = { lat: 39.7817, lng: -89.6501 }, zoom = 17, pollInterval = 5000, showFence = false, fenceRadius = 2000 }) => {
  const [points, setPoints] = useState([]);
  const [selected, setSelected] = useState(null);
  const mounted = useRef(false);
  const mapRef = useRef(null);
  const [followRaw, setFollowRaw] = useState(true);

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: ['places']
  });

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
        console.error('GoogleLiveMap: failed to fetch locations', err);
      }
    };

    fetchAndSet();
    const pollId = setInterval(fetchAndSet, pollInterval);

    let evtSource;
    try {
      const base = (process.env.REACT_APP_API_URL || 'https://cattle-farm-monitoring-backend.onrender.com/api/v1');
      const streamUrl = base + '/gps/stream';
      evtSource = new EventSource(streamUrl);
      evtSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          // require coordinates; allow animal_id === 0 (raw GPS)
          if (!data || data.latitude == null || data.longitude == null) return;
          const id = (data.animal_id !== undefined && data.animal_id !== null) ? data.animal_id : 0;
          setPoints(prev => {
            const byId = new Map(prev.map(p => [p.animal_id, p]));
            byId.set(id, {
              animal_id: id,
              latitude: Number(data.latitude),
              longitude: Number(data.longitude),
              speed_kmh: data.speed_kmh,
              battery_level: data.battery_level,
              timestamp: data.recorded_at || data.timestamp
            });
            const updated = Array.from(byId.values());
            // If this is the raw GPS point (id === 0) and follow is enabled, pan the map
            if (id === 0 && followRaw && mapRef.current && mapRef.current.panTo) {
              try {
                mapRef.current.panTo({ lat: Number(data.latitude), lng: Number(data.longitude) });
              } catch (e) {
                console.warn('Failed to pan map to raw GPS:', e);
              }
            }
            return updated;
          });
        } catch (err) {
          console.warn('GoogleLiveMap SSE parse error:', err);
        }
      };
      evtSource.onerror = (err) => console.warn('GoogleLiveMap SSE error', err);
    } catch (err) {
      console.warn('GoogleLiveMap: failed to open SSE stream', err);
    }

    return () => {
      mounted.current = false;
      clearInterval(pollId);
      if (evtSource) try { evtSource.close(); } catch (e) {}
    };
  }, [pollInterval, followRaw]);

  const markers = useMemo(() => points.map(p => ({
    position: { lat: p.latitude, lng: p.longitude },
    animal_id: p.animal_id,
    speed_kmh: p.speed_kmh,
    battery_level: p.battery_level,
    timestamp: p.timestamp
  })), [points]);

  // Hover + blink state for markers
  const [hoveredId, setHoveredId] = useState(null);
  const [blinkOn, setBlinkOn] = useState(false);
  const blinkIntervalRef = useRef(null);

  const startBlink = (id) => {
    if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current);
    setHoveredId(id);
    setBlinkOn(true);
    blinkIntervalRef.current = setInterval(() => setBlinkOn(b => !b), 600);
  };

  const stopBlink = () => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }
    setBlinkOn(false);
    setHoveredId(null);
  };

  if (loadError) return <div>Map failed to load</div>;
  if (!isLoaded) return <div>Loading map...</div>;

  const mapOptions = {
    mapTypeId: 'satellite',
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: window.google?.maps?.MapTypeControlStyle.DROPDOWN_MENU,
      position: window.google?.maps?.ControlPosition.BOTTOM_LEFT
    },
    fullscreenControl: true,
    streetViewControl: true,
    zoomControl: true,
    scaleControl: true
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={zoom}
        options={mapOptions}
        onLoad={map => { mapRef.current = map; }}
      >
        {/* Follow raw GPS toggle */}
        <div style={{ position: 'absolute', right: 12, top: 12, zIndex: 10 }}>
          <button onClick={() => setFollowRaw(f => !f)} style={{ padding: '6px 8px', fontSize: 12 }}>
            {followRaw ? 'Following: RAW' : 'Follow: OFF'}
          </button>
        </div>
        {showFence && (
          <Circle center={center} radius={fenceRadius} options={{ strokeColor: '#4b8b3b', fillColor: '#4b8b3b', fillOpacity: 0.08 }} />
        )}

        {markers.map(m => {
          const isHovered = hoveredId === m.animal_id;
          const scale = (isHovered && blinkOn) ? 12 : 6;
          return (
            <Marker
              key={m.animal_id}
              position={m.position}
              onClick={() => setSelected(m)}
              onMouseOver={() => startBlink(m.animal_id)}
              onMouseOut={() => stopBlink()}
              icon={{
                path: window.google?.maps?.SymbolPath.CIRCLE,
                fillColor: colorForId(m.animal_id),
                fillOpacity: isHovered ? 1 : 0.9,
                scale,
                strokeWeight: isHovered ? 3 : 2,
                strokeColor: '#fff'
              }}
            >
              {/* show small info window with coords while hovered */}
              {isHovered && (
                <InfoWindow position={m.position} options={{ pixelOffset: new window.google.maps.Size(0, -10) }}>
                  <div style={{ fontSize: 12 }}>{`${m.position.lat.toFixed(5)}, ${m.position.lng.toFixed(5)}`}</div>
                </InfoWindow>
              )}
            </Marker>
          );
        })}

        {selected && (
          <InfoWindow position={selected.position} onCloseClick={() => setSelected(null)}>
            <div style={{ minWidth: 180 }}>
              <div><strong>Animal ID:</strong> {selected.animal_id}</div>
              <div><strong>Time:</strong> {selected.timestamp ? new Date(selected.timestamp).toLocaleString() : 'N/A'}</div>
              <div><strong>Speed:</strong> {selected.speed_kmh ?? 'N/A'} km/h</div>
              <div><strong>Battery:</strong> {selected.battery_level ?? 'N/A'}%</div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default GoogleLiveMap;

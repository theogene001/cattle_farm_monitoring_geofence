// src/App.js - Updated to use Backend API with Chart Components
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Home, Map, Users, Bell, BarChart3, Settings,
  AlertTriangle, CheckCircle, Activity, RefreshCw, Search,
  Edit, Save, X, Trash2, LogOut, Copy, Plus, Minus
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './App.css';
import logo from './img/logo.jpg';
import { GiCow } from 'react-icons/gi';
import apiService from './services/apiService';
// Import chart components
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  AreaChart 
} from './components/charts/ChartComponents';
import {
  processAlertTrendData,
  processAlertTypeData,
  processMonthlyActivityData,
  processFarmSummaryData,
  
} from './components/charts/chartDataUtils';

// Create custom icon for markers
const createCustomIcon = (color = '#3CB371') => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

// Create a pulsing div icon for boundary tower
const createPulsingIcon = (color = '#8A2BE2', size = 18) => {
  const pulseSize = size * 2.5;
  const html = `
    <div style="position: relative; width: ${pulseSize}px; height: ${pulseSize}px; display:flex; align-items:center; justify-content:center;">
      <div style="width: ${pulseSize}px; height: ${pulseSize}px; border-radius: 50%; background: ${color}; opacity: 0.12; animation: pulse 1.8s ease-out infinite;"></div>
      <div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: ${color}; border: 2px solid white; box-shadow: 0 0 8px ${color};"></div>
    </div>
    <style>
      @keyframes pulse {
        0% { transform: scale(0.6); opacity: 0.3; }
        50% { transform: scale(1.1); opacity: 0.12; }
        100% { transform: scale(1.6); opacity: 0; }
      }
    </style>
  `;
  return L.divIcon({ html, className: '', iconSize: [pulseSize, pulseSize], iconAnchor: [pulseSize/2, pulseSize/2] });
};

// Compute destination point given start lat/lng, distance (meters) and bearing (degrees)
const computeEdgePoint = (lat, lng, distanceMeters, bearingDeg = 90) => {
  if (lat == null || lng == null) return { lat, lng };
  const R = 6371000; // Earth radius in meters
  const bearing = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const δ = distanceMeters / R;

  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(bearing));
  const λ2 = λ1 + Math.atan2(Math.sin(bearing) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));

  return {
    lat: (φ2 * 180) / Math.PI,
    lng: (λ2 * 180) / Math.PI
  };
};

// Helper: compute an evenly-distributed bearing for a tower based on index
const getTowerBearing = (index, total) => {
  if (!total || total <= 0) return 90;
  return (index * (360 / total)) % 360;
};

const App = ({ user, onLogout }) => {
// MapController component to handle map view changes (centers on selected position)
const MapController = ({ selectedPosition, zoomLevel = 16 }) => {
  const map = useMap();

  React.useEffect(() => {
    if (selectedPosition && selectedPosition.lat != null && selectedPosition.lng != null) {
      map.setView([selectedPosition.lat, selectedPosition.lng], zoomLevel);
    }
  }, [selectedPosition, zoomLevel, map]);

  return null;
};
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState({
    farm: null,
    summary: {
      totalAnimals: 0,
      activeCollars: 0,
      virtualFences: 0,
      activeAlerts: 0
    },
    alerts: [],
    animals: [],
    virtualFences: [],
    animalLocations: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAlertLocation, setSelectedAlertLocation] = useState(null);
  // selectedTower will hold the virtual_fence (tower) object to identify on the map
  const [selectedTower, setSelectedTower] = useState(null);
  const [selectedMapPosition, setSelectedMapPosition] = useState(null);
  const [showOutsideAnimals, setShowOutsideAnimals] = useState(false);

  // Persisted farm center and boundary radius (shared across the app)
  const [farmCenter, setFarmCenter] = useState(() => {
    try {
      const raw = localStorage.getItem('farmBoundaryCenter');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 2) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse stored farm center', e);
    }
    // default center
    return [39.7817, -89.6501];
  });

  const [farmBoundaryRadius, setFarmBoundaryRadius] = useState(() => {
    try {
      const raw = localStorage.getItem('farmBoundaryRadius');
      if (raw) return Number(raw);
    } catch (e) {
      console.warn('Failed to parse stored farm boundary radius', e);
    }
    // default radius (meters)
    return 2000;
  });

  // Persist any changes to localStorage
  useEffect(() => {
    try { localStorage.setItem('farmBoundaryCenter', JSON.stringify(farmCenter)); } catch (e) { /* ignore */ }
  }, [farmCenter]);
  useEffect(() => {
    try { localStorage.setItem('farmBoundaryRadius', String(farmBoundaryRadius)); } catch (e) { /* ignore */ }
  }, [farmBoundaryRadius]);

  // When backend provides farm metadata, use it as defaults if nothing is stored yet
  useEffect(() => {
    if (dashboardData.farm) {
      try {
        const hasStoredCenter = !!localStorage.getItem('farmBoundaryCenter');
        const hasStoredRadius = !!localStorage.getItem('farmBoundaryRadius');
        if (!hasStoredCenter && dashboardData.farm.center_latitude && dashboardData.farm.center_longitude) {
          setFarmCenter([Number(dashboardData.farm.center_latitude), Number(dashboardData.farm.center_longitude)]);
        }
        if (!hasStoredRadius && dashboardData.farm.boundary_radius_meters) {
          setFarmBoundaryRadius(Number(dashboardData.farm.boundary_radius_meters));
        }
      } catch (e) {
        console.warn('Failed to initialize farm boundary from backend', e);
      }
    }
  }, [dashboardData.farm]);

  // Helper: distance in meters (haversine)
  const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => deg * Math.PI / 180;
    const R = 6371000; // meters
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getCowStatusColor = (status) => {
    if (!status) return '#7f8c8d';
    const s = (status || '').toLowerCase();
    if (s.includes('healthy') || s.includes('good') || s === 'ok') return '#3CB371';
    if (s.includes('warning') || s.includes('sick') || s.includes('minor')) return '#FFA726';
    if (s.includes('critical') || s.includes('danger') || s.includes('severe') || s.includes('alert')) return '#FF6B6B';
    return '#95a5a6';
  };

  // Load data from backend API
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
  // Load dashboard summary
      const summaryResponse = await apiService.getDashboardSummary();
      if (summaryResponse.success) {
        setDashboardData(prev => ({
          ...prev,
          farm: summaryResponse.data.farm,
          summary: summaryResponse.data.summary,
          alerts: summaryResponse.data.alerts
        }));
      }

  // Load animals
      const animalsResponse = await apiService.getAnimals();
      if (animalsResponse.success) {
        setDashboardData(prev => ({
          ...prev,
          animals: animalsResponse.data
        }));
      }

  // Load virtual fences
      const fencesResponse = await apiService.getVirtualFences();
      if (fencesResponse.success) {
        setDashboardData(prev => ({
          ...prev,
          virtualFences: fencesResponse.data
        }));
      }

  // Load animal locations
      const locationsResponse = await apiService.getAnimalLocations();
      // Load all alerts (include read/unread)
      const alertsResponse = await apiService.getAlerts();
      if (alertsResponse.success) {
        setDashboardData(prev => ({
          ...prev,
          alerts: alertsResponse.data
        }));
      }
      if (locationsResponse.success) {
        setDashboardData(prev => ({
          ...prev,
          animalLocations: locationsResponse.data
        }));
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Handle viewing alert on map
    const handleViewAlertOnMap = (selectedAlert) => {
      const lat = parseFloat(selectedAlert.location_latitude);
      const lng = parseFloat(selectedAlert.location_longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setSelectedAlertLocation({
          lat,
          lng,
          alertId: selectedAlert.id,
          alertType: selectedAlert.alert_type,
          message: selectedAlert.message
        });
        setCurrentScreen('map');
      } else {
        window.alert('Location data not available for this alert');
      }
  };

  // Navigation items with Lucide icons
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'map', label: 'Farm Map', icon: Map },
    { id: 'collars', label: 'Cow Management', icon: GiCow },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Dashboard Screen
  const DashboardScreen = () => (
    <div className="content-area">
      <div className="content-header">
        <h1>Farm Dashboard</h1>
        {/* <p>Virtual Cattle Farm Fence - {dashboardData.farm?.name || 'Loading...'}</p> */}
        <button 
          className="refresh-btn" 
          onClick={loadDashboardData} 
          disabled={loading}
          title="Refresh Data"
        >
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-card">
          <AlertTriangle size={20} />
          <p>{error}</p>
          <button onClick={loadDashboardData}>Try Again</button>
        </div>
      )}

      {/* Farm Overview Cards */}
      <div className="cards-grid">
        <div className="stat-card green-card">
          <div className="stat-icon">
            <GiCow className="cow-icon" />
          </div>
          <div className="stat-content">
            <h3>{dashboardData.summary.totalAnimals}</h3>
            <p>Total Cows</p>
          </div>
        </div>

        <div className="stat-card green-card">
          <div className="stat-icon">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <h3>{dashboardData.summary.totalCollars}</h3>
            <p>Total Collars</p>
          </div>
        </div>

        <div className="stat-card green-card">
          <div className="stat-icon">
            <Map size={24} />
          </div>
          <div className="stat-content">
            <h3>{dashboardData.summary.totalTowers}</h3>
            <p>Total Towers</p>
          </div>
        </div>

        <div className="stat-card alert-card">
          <div className="stat-icon">
            <Bell size={24} />
          </div>
          <div className="stat-content">
            <h3>{dashboardData.summary.totalAlerts}</h3>
            <p>Total Alerts</p>
          </div>
        </div>
      </div>

      {/* Farm Information */}
      {dashboardData.farm && (
        <div className="info-section">
          <div className="info-card">
            <h3>
              <Activity size={20} />
              Farm Information
            </h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Farm Name:</span>
                <span className="info-value">{dashboardData.farm.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Owner:</span>
                <span className="info-value">{user?.email || 'Farm Manager'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Location:</span>
                <span className="info-value">{dashboardData.farm.location}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Size:</span>
                <span className="info-value">{dashboardData.farm.size_hectares} hectares</span>
              </div>
            </div>
          </div>

          {/* Recent Alerts (latest 2 only) */}
          <div className="info-card">
            <h3>
              <Bell size={20} />
              Recent Alerts
            </h3>
            {dashboardData.alerts.slice(0, 2).map((alert) => (
              <div key={alert.id} className="alert-item">
                <span className={`alert-indicator ${alert.severity}`}>
                  <AlertTriangle size={12} />
                </span>
                <div className="alert-content">
                  <p className="alert-message">{alert.message}</p>
                  <span className="alert-time">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            {dashboardData.alerts.length === 0 && (
              <p className="no-data">No recent alerts</p>
            )}
          </div>
        </div>
      )}

      {/* Animal Status */}
        <div className="info-card">
        <h3>
          <GiCow className="cow-icon" />
          Cow's Status Overview
        </h3>
        <div className="animals-grid">
          {dashboardData.animals.map((animal) => {
            const statusColor = getCowStatusColor(animal.health_status);
            return (
            <div key={animal.id} className="animal-status">
              <div className="animal-avatar">
                <GiCow className="cow-avatar" style={{ color: statusColor }} />
              </div>
              <div className="animal-details">
                <strong>{animal.name}</strong>
                <span>Tag: {animal.tag_number}</span>
              </div>
              <div className="status-badge">
                <span className={`status ${animal.health_status}`}>
                  <span className="status-dot" style={{ background: statusColor }}></span>
                  {animal.health_status || 'unknown'}
                </span>
              </div>
            </div>
            )
          })}
        </div>
        {dashboardData.animals.length === 0 && (
          <p className="no-data">No Cow found</p>
        )}
      </div>
    </div>
  );

  // Map Screen with Enhanced Location Management
  const MapScreen = () => {
    const [mapMode, setMapMode] = useState('view'); // 'view', 'create', 'edit'
    const [showFenceForm, setShowFenceForm] = useState(false);
    const [editingFence, setEditingFence] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [fenceFormData, setFenceFormData] = useState({
      name: '',
      description: '',
      center_latitude: '',
      center_longitude: '',
      radius_meters: 500,
      fence_type: 'custom',
      is_active: true
    });
    const [showLocationManager, setShowLocationManager] = useState(false);
    const [animalTrackingMode, setAnimalTrackingMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
    // Note: farmBoundaryRadius and farmCenter are managed at top-level and persisted to localStorage
    // Handle map click for fence creation
    const handleMapClick = (e) => {
      if (mapMode === 'create') {
        const { lat, lng } = e.latlng;
        setSelectedLocation([lat, lng]);
        setFenceFormData(prev => ({
          ...prev,
          center_latitude: lat.toFixed(8),
          center_longitude: lng.toFixed(8)
        }));
        setShowFenceForm(true);
      }
    };

    // Handle fence form submission
    const handleFenceSubmit = async (e) => {
      e.preventDefault();
      try {
        setLoading(true);
        
        const fenceData = {
          ...fenceFormData,
          center_latitude: parseFloat(fenceFormData.center_latitude),
          center_longitude: parseFloat(fenceFormData.center_longitude),
          radius_meters: parseInt(fenceFormData.radius_meters)
        };

        let response;
        if (editingFence) {
          response = await apiService.updateVirtualFence(editingFence.id, fenceData);
        } else {
          response = await apiService.createVirtualFence(fenceData);
        }

        if (response.success) {
          await loadDashboardData(); // Refresh data
          setShowFenceForm(false);
          setEditingFence(null);
          setMapMode('view');
          setSelectedLocation(null);
          setFenceFormData({
            name: '',
            description: '',
            center_latitude: '',
            center_longitude: '',
            radius_meters: 500,
            fence_type: 'custom',
            is_active: true
          });
        }
      } catch (error) {
        console.error('Failed to save fence:', error);
        setError('Failed to save fence. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    // Handle fence edit
    const handleFenceEdit = (fence) => {
      setEditingFence(fence);
      setFenceFormData({
        name: fence.name,
        description: fence.description || '',
        center_latitude: fence.center_latitude.toString(),
        center_longitude: fence.center_longitude.toString(),
        radius_meters: fence.radius_meters,
        fence_type: fence.fence_type,
        is_active: fence.is_active
      });
      setShowFenceForm(true);
      setMapMode('edit');
    };

    // Handle fence delete
    const handleFenceDelete = async (fenceId) => {
      if (window.confirm('Are you sure you want to delete this fence?')) {
        try {
          setLoading(true);
          const response = await apiService.deleteVirtualFence(fenceId);
          if (response.success) {
            await loadDashboardData(); // Refresh data
          }
        } catch (error) {
          console.error('Failed to delete fence:', error);
          setError('Failed to delete fence. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    };

    return (
      <div className="content-area">
        <div className="content-header">
          <h1>Live Farm Map</h1>
         

          
          
          {/* Map Controls */}
          <div className="map-controls">
            <button 
              className={`control-btn ${mapMode === 'view' ? 'active' : ''}`}
              onClick={() => setMapMode('view')}
            >
              <Map size={16} /> View Mode
            </button>
           
          </div>
        </div>

        <div className="map-container">
          {/* boundary-controls moved into map legend for a cleaner layout */}
          <MapContainer
            center={farmCenter}
            zoom={14}
            style={{ height: '500px', width: '100%' }}
            scrollWheelZoom={true}
            onclick={handleMapClick}
          >
              <MapController selectedPosition={
                selectedMapPosition ? selectedMapPosition : (
                  selectedTower ? (
                    selectedTower.id === 'main-boundary' ? computeEdgePoint(farmCenter[0], farmCenter[1], farmBoundaryRadius, 90) : computeEdgePoint(Number(selectedTower.center_latitude), Number(selectedTower.center_longitude), Number(selectedTower.radius_meters || 0), 90)
                  ) : selectedAlertLocation
                )
              } />
            {/* Satellite Tile Layer */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            />
            
            {/* Selected Location Marker (for new fence creation) */}
            {selectedLocation && mapMode === 'create' && (
              <Marker position={selectedLocation} icon={createCustomIcon('#FFD700')}>
                <Popup>
                  <div className="fence-popup">
                    <h4>New Fence Location</h4>
                    <p>Lat: {selectedLocation[0].toFixed(6)}</p>
                    <p>Lng: {selectedLocation[1].toFixed(6)}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Virtual Fence Boundaries */}
              <Circle
                center={farmCenter}
                radius={farmBoundaryRadius}
                pathOptions={{ color: '#6a5acd', fillColor: '#6a5acd', fillOpacity: 0.05, weight: 2, dashArray: '6 4' }}
              />

            {/* Main boundary tower marker placed at farm boundary (east) */}
            {farmCenter && (
              (() => {
                const edge = computeEdgePoint(farmCenter[0], farmCenter[1], farmBoundaryRadius, 90);
                return (
                  <Marker position={[edge.lat, edge.lng]} icon={createPulsingIcon('#8A2BE2', 18)}>
                    <Popup>
                      <div>
                        <h4>Main Boundary Tower</h4>
                        <p>Coords: {Number(edge.lat).toFixed(6)}, {Number(edge.lng).toFixed(6)}</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-small" onClick={() => { navigator.clipboard?.writeText(`${edge.lat},${edge.lng}`); alert('Coordinates copied'); }}>Copy</button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })()
            )}
            {/* Individual fence boundary circles removed to keep map clear.
                Towers (perimeter markers) are still shown and can be managed
                from the Towers panel (Edit/Delete). */}

            {/* Tower markers (identifyable) - reuse virtual fences as towers */}
            {dashboardData.virtualFences.map((tower, idx) => {
              // place towers on the farm boundary evenly distributed
              const bearing = getTowerBearing(idx, dashboardData.virtualFences.length);
              const edge = computeEdgePoint(farmCenter[0], farmCenter[1], farmBoundaryRadius, bearing);
              const isSelectedTower = selectedTower && selectedTower.id === tower.id;
              return (
                <Marker
                  key={`tower-${tower.id}`}
                  position={[edge.lat, edge.lng]}
                  icon={createPulsingIcon(isSelectedTower ? '#FF8C00' : '#8A2BE2', 14)}
                >
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <h4>{tower.name || 'Tower'}</h4>
                      <p><strong>Type:</strong> {tower.fence_type}</p>
                      <p><strong>Coords:</strong> {Number(edge.lat).toFixed(6)}, {Number(edge.lng).toFixed(6)}</p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="btn-small" onClick={() => { setSelectedTower(tower); setSelectedMapPosition({ lat: edge.lat, lng: edge.lng }); setCurrentScreen('map'); }}>
                          <Map size={12} /> Locate
                        </button>
                        <button className="btn-small" onClick={() => { navigator.clipboard?.writeText(`${edge.lat},${edge.lng}`); alert('Coordinates copied'); }}>
                          <Copy /> Copy
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            
            {/* Animal Markers: by default show only animals inside boundary; user can toggle to show outside animals */}
            {(() => {
              const inside = [];
              const outside = [];
              for (const location of dashboardData.animalLocations) {
                if (location.latitude == null || location.longitude == null) continue;
                const dist = haversineDistanceMeters(farmCenter[0], farmCenter[1], Number(location.latitude), Number(location.longitude));
                if (dist <= Number(farmBoundaryRadius)) inside.push(location);
                else outside.push(location);
              }
              const toShow = showOutsideAnimals ? [...inside, ...outside] : inside;
              return (
                <>
                  {outside.length > 0 && !showOutsideAnimals && (
                    <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1500, background: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                      <div style={{ fontSize: 13, color: '#b33' }}>{outside.length} animal(s) appear outside the farm boundary</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <button className="btn-small" onClick={() => setShowOutsideAnimals(true)}>Show Outside</button>
                        <button className="btn-small" onClick={() => { setSelectedMapPosition({ lat: outside[0].latitude, lng: outside[0].longitude }); setCurrentScreen('map'); }}>Locate First</button>
                      </div>
                    </div>
                  )}

                  {toShow.map((location) => {
                    const animal = dashboardData.animals.find(a => a.id === location.animal_id);
                    const dist = haversineDistanceMeters(farmCenter[0], farmCenter[1], Number(location.latitude), Number(location.longitude));
                    const isOutside = dist > Number(farmBoundaryRadius);
                    const isSelected = selectedAlertLocation &&
                      Math.abs(location.latitude - selectedAlertLocation.lat) < 0.0001 &&
                      Math.abs(location.longitude - selectedAlertLocation.lng) < 0.0001;
                    return (
                      <React.Fragment key={location.id}>
                        <Marker 
                          position={[location.latitude, location.longitude]}
                          icon={createCustomIcon(isSelected ? '#FF0000' : (isOutside ? '#FF4500' : '#3CB371'))}
                        >
                          <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                            <div style={{ minWidth: 140 }}>
                              <div style={{ fontWeight: 700 }}>{animal?.name || 'Unknown'}</div>
                              <div style={{ fontSize: 12, color: '#444' }}>Tag: {animal?.tag_number || 'N/A'}</div>
                              <div style={{ fontSize: 12, color: '#666' }}>Last: {new Date(location.timestamp).toLocaleTimeString()}</div>
                              {isOutside && <div style={{ color: '#e04', fontSize: 12 }}>Outside boundary</div>}
                            </div>
                          </Tooltip>
                          <Popup>
                              <div className="animal-popup">
                                <h4>{animal?.name || 'Unknown Animal'}</h4>
                                <p><strong>Tag:</strong> {animal?.tag_number}</p>
                                <p><strong>Location:</strong> {Number(location.latitude).toFixed(6)}, {Number(location.longitude).toFixed(6)}</p>
                                <p><strong>Last Update:</strong> {new Date(location.timestamp).toLocaleTimeString()}</p>
                                {isOutside && <div style={{ color: '#e04' }}>Outside farm boundary</div>}
                                {animalTrackingMode && (
                                  <div className="animal-actions">
                                    <button className="btn-small track-btn">
                                      <Activity size={12} /> View History
                                    </button>
                                  </div>
                                )}
                              </div>
                          </Popup>
                        </Marker>
                        {/* Location indicator marker (pulsing dot) */}
                        <Marker 
                          position={[location.latitude, location.longitude]}
                          icon={L.divIcon({
                            html: `<div class='location-indicator' style='background: ${isSelected ? "rgba(255,0,0,0.7)" : (isOutside ? "rgba(255,69,0,0.7)" : "rgba(33,150,243,0.7)")};'></div>`,
                            className: '',
                            iconSize: [18, 18],
                            iconAnchor: [9, 9]
                          })}
                        />
                      </React.Fragment>
                    );
                  })}

                  {/* Outside animals panel when showing outside animals */}
                  {showOutsideAnimals && outside.length > 0 && (
                    <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 1500, background: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', maxHeight: 220, overflow: 'auto' }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Outside Animals</div>
                      {outside.map(loc => {
                        const a = dashboardData.animals.find(x => x.id === loc.animal_id);
                        return (
                          <div key={`out-${loc.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{a?.name || 'Unknown'}</div>
                              <div style={{ fontSize: 12, color: '#666' }}>{Number(loc.latitude).toFixed(6)}, {Number(loc.longitude).toFixed(6)}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <button className="btn-small" onClick={() => setSelectedMapPosition({ lat: loc.latitude, lng: loc.longitude })}>Locate</button>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <button className="btn-small" onClick={() => setShowOutsideAnimals(false)}>Hide</button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
            {/* Alert marker: always render selected alert location so user can see it even if outside boundary */}
            {selectedAlertLocation && (
              <Marker position={[selectedAlertLocation.lat, selectedAlertLocation.lng]} icon={createCustomIcon('#FF0000')}>
                <Popup>
                  <div>
                    <h4>Alert</h4>
                    <p>{selectedAlertLocation.alertType || 'Alert'}</p>
                    <p>{selectedAlertLocation.message || ''}</p>
                    <p><strong>Coords:</strong> {Number(selectedAlertLocation.lat).toFixed(6)}, {Number(selectedAlertLocation.lng).toFixed(6)}</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          <div className="map-legend">
            <h4>Map Legend</h4>
            <div className="legend-item">
              <div className="legend-color green"></div>
              <span>Active Virtual Fence</span>
            </div>
            <div className="legend-item">
              <div className="legend-color red"></div>
              <span>Inactive Virtual Fence</span>
            </div>
            {/* <div className="legend-item">
              <div className="legend-color blue"></div>
              <span>Healthy cow</span>
            </div> */}
            {/* <div className="legend-item">
              <div className="legend-color orange"></div>
              <span>cow Health Alert</span>
            </div> */}
              {selectedAlertLocation && (
                <div className="legend-item">
                  <div className="legend-color red"></div>
                  <span>Alert Location</span>
                </div>
              )}
            {mapMode === 'create' && (
              <div className="legend-item">
                <div className="legend-color gold"></div>
                <span>New Fence Location</span>
              </div>
            )}
            {/* Boundary controls moved into legend */}
            <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #eee' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <button className="btn-small" onClick={() => setFarmBoundaryRadius(r => Math.max(50, r - 100))}><Minus size={12} /></button>
                <div style={{ minWidth: 180 }}>
                  <input type="range" min="50" max="20000" step="50" value={farmBoundaryRadius} onChange={(e) => setFarmBoundaryRadius(Number(e.target.value))} style={{ width: '100%' }} />
                  <div style={{ fontSize: 12, textAlign: 'center' }}>{farmBoundaryRadius} m</div>
                </div>
                <button className="btn-small" onClick={() => setFarmBoundaryRadius(r => r + 100)}><Plus size={12} /></button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-small" onClick={() => setFarmBoundaryRadius(dashboardData.farm?.boundary_radius_meters || 2000)}>Reset</button>
                <button className="btn-small" onClick={() => {
                  const edge = computeEdgePoint(farmCenter[0], farmCenter[1], farmBoundaryRadius, 90);
                  setSelectedTower({ id: 'main-boundary', center_latitude: edge.lat, center_longitude: edge.lng, radius_meters: 0, name: 'Main Boundary Tower' });
                  setCurrentScreen('map');
                }}>Locate Boundary Tower</button>
                <button className="btn-small" onClick={() => {
                  setFarmCenter([Number(farmCenter[0]), Number(farmCenter[1])]);
                  alert('Farm center persisted to local storage');
                }}>Save Center</button>
              </div>
            </div>
          </div>
        </div>

          {/* Towers Panel (identify towers on map) */}
          <div className="towers-panel">
            <div className="panel-header">
              <h4>Towers</h4>
              <button className="close-btn" onClick={() => { setSelectedTower(null); setShowLocationManager(false); }}>Clear</button>
            </div>
            <div className="panel-body">
              <input
                type="text"
                placeholder="Search towers..."
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ddd', marginBottom: 8 }}
              />
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {dashboardData.virtualFences
                  .filter(t => !searchTerm || (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((t, idx) => {
                    const bearing = getTowerBearing(idx, dashboardData.virtualFences.length);
                    const edge = computeEdgePoint(farmCenter[0], farmCenter[1], farmBoundaryRadius, bearing);
                    return (
                      <div key={`panel-${t.id}`} className="tower-item">
                        <div>
                          <strong>{t.name || `Tower ${t.id}`}</strong>
                          <div style={{ fontSize: 12, color: '#666' }}>{Number(edge.lat).toFixed(6)}, {Number(edge.lng).toFixed(6)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-small" onClick={() => { setSelectedTower(t); setSelectedMapPosition({ lat: edge.lat, lng: edge.lng }); setCurrentScreen('map'); }}>
                            <Map size={12} /> Locate
                          </button>
                            <button className="btn-small" onClick={() => { navigator.clipboard?.writeText(`${edge.lat},${edge.lng}`); alert('Coordinates copied'); }}>
                              <Copy size={12} />
                            </button>
                            <button className="btn-small edit-btn" onClick={() => handleFenceEdit(t)}><Edit size={12} /> Edit</button>
                            <button className="btn-small delete-btn" onClick={() => handleFenceDelete(t.id)}><Trash2 size={12} /> Delete</button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

        {/* Map Stats */}
        <div className="map-stats">
          <div className="stat-item">
            <strong>{dashboardData.animals.length}</strong>
            <span>cow Tracked</span>
          </div>
          <div className="stat-item">
            <strong>{dashboardData.virtualFences.filter(f => f.is_active).length}</strong>
            <span>Active Fences</span>
          </div>
          <div className="stat-item">
            <strong>{dashboardData.alerts.length}</strong>
            <span>Active Alerts</span>
          </div>
          <div className="stat-item">
            <strong>Online</strong>
            <span>System Status</span>
          </div>
        </div>

        {/* Fence Creation/Edit Form Modal */}
        {showFenceForm && (
          <div className="modal-overlay">
            <div className="modal-content fence-form-modal">
              <div className="modal-header">
                <h3>{editingFence ? 'Edit Virtual Fence' : 'Create New Virtual Fence'}</h3>
                <button 
                  className="close-btn"
                  onClick={() => {
                    setShowFenceForm(false);
                    setEditingFence(null);
                    setMapMode('view');
                    setSelectedLocation(null);
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleFenceSubmit} className="fence-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Fence Name *</label>
                    <input
                      type="text"
                      value={fenceFormData.name}
                      onChange={(e) => setFenceFormData(prev => ({...prev, name: e.target.value}))}
                      required
                      placeholder="e.g., Main Pasture, Watering Area"
                    />
                  </div>

                  <div className="form-group">
                    <label>Fence Type</label>
                    <select
                      value={fenceFormData.fence_type}
                      onChange={(e) => setFenceFormData(prev => ({...prev, fence_type: e.target.value}))}
                    >
                      <option value="main_pasture">Main Pasture</option>
                      <option value="watering_area">Watering Area</option>
                      <option value="feeding_area">Feeding Area</option>
                      <option value="restricted_zone">Restricted Zone</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Center Latitude *</label>
                    <input
                      type="number"
                      step="0.00000001"
                      value={fenceFormData.center_latitude}
                      onChange={(e) => setFenceFormData(prev => ({...prev, center_latitude: e.target.value}))}
                      required
                      placeholder="e.g., 39.7817"
                    />
                  </div>

                  <div className="form-group">
                    <label>Center Longitude *</label>
                    <input
                      type="number"
                      step="0.00000001"
                      value={fenceFormData.center_longitude}
                      onChange={(e) => setFenceFormData(prev => ({...prev, center_longitude: e.target.value}))}
                      required
                      placeholder="e.g., -89.6501"
                    />
                  </div>

                  <div className="form-group">
                    <label>Radius (meters) *</label>
                    <input
                      type="number"
                      min="50"
                      max="10000"
                      value={fenceFormData.radius_meters}
                      onChange={(e) => setFenceFormData(prev => ({...prev, radius_meters: parseInt(e.target.value)}))}
                      required
                    />
                    <small>Range: 50m - 10km</small>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={fenceFormData.is_active}
                        onChange={(e) => setFenceFormData(prev => ({...prev, is_active: e.target.checked}))}
                      />
                      Active Fence
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={fenceFormData.description}
                    onChange={(e) => setFenceFormData(prev => ({...prev, description: e.target.value}))}
                    placeholder="Optional description for this virtual fence..."
                    rows="3"
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => {
                      setShowFenceForm(false);
                      setEditingFence(null);
                      setMapMode('view');
                      setSelectedLocation(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={loading}
                  >
                    <Save size={16} />
                    {loading ? 'Saving...' : (editingFence ? 'Update Fence' : 'Create Fence')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Location Manager Panel */}
        {showLocationManager && (
          <div className="location-manager-panel">
            <div className="panel-header">
              <h4>Location Manager</h4>
              <button 
                className="close-btn"
                onClick={() => setShowLocationManager(false)}
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="panel-content">
              <div className="location-stats">
                <h5>Farm Coordinates</h5>
                <p><strong>Center:</strong> {farmCenter[0]}, {farmCenter[1]}</p>
                <p><strong>Total Fences:</strong> {dashboardData.virtualFences.length}</p>
                <p><strong>Active cows:</strong> {dashboardData.animalLocations.length}</p>
              </div>

              <div className="quick-actions">
                <h5>Quick Actions</h5>
                <button 
                  className="panel-btn"
                  onClick={() => {
                    setMapMode('create');
                    setShowLocationManager(false);
                  }}
                >
                  <Edit size={14} /> Create New Fence
                </button>
                <button 
                  className="panel-btn"
                  onClick={() => setAnimalTrackingMode(!animalTrackingMode)}
                >
                  <Activity size={14} /> Toggle cows Tracking
                </button>
                <button 
                  className="panel-btn"
                  onClick={loadDashboardData}
                >
                  <RefreshCw size={14} /> Refresh Map Data
                </button>
              </div>
            </div>
          </div>
        )}

        {mapMode === 'create' && (
          <div className="map-instruction">
            <AlertTriangle size={16} />
            Click anywhere on the map to place a new virtual fence
          </div>
        )}
        {/* Single map displayed above — LiveMap component removed to avoid duplicate maps */}
      </div>
    );
  };

  // Users Management Screen
  const UsersManagementScreen = () => {
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);
    const [showEditUser, setShowEditUser] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    const [userForm, setUserForm] = useState({
      name: '',
      email: '',
      password: '',
      role: 'user'
    });

    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await apiService.getUsers();
        if (res && res.success) setUsers(res.data || []);
        else setUsers([]);
      } catch (err) {
        console.error('Failed to load users', err);
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    useEffect(() => {
      loadUsers();
    }, []);

    const resetForm = () => {
      setUserForm({ name: '', email: '', password: '', role: 'user' });
      setFormErrors({});
    };

    const validateUserForm = (isEdit = false) => {
      const errors = {};
      if (!userForm.name || !userForm.name.trim()) errors.name = 'Name is required';
      if (!userForm.email || !/^[\w-.]+@[\w-]+\.[A-Za-z]{2,}$/.test(userForm.email)) errors.email = 'Valid email is required';
      if (!isEdit && (!userForm.password || userForm.password.length < 6)) errors.password = 'Password (min 6 chars) is required';
      return errors;
    };

    const handleCreateUser = async (e) => {
      e.preventDefault();
      const errors = validateUserForm(false);
      if (Object.keys(errors).length) {
        setFormErrors(errors);
        return;
      }
      setFormLoading(true);
      try {
        const payload = { name: userForm.name, email: userForm.email, password: userForm.password, role: userForm.role };
        const res = await apiService.createUser(payload);
        if (res && res.success) {
          await loadUsers();
          setShowAddUser(false);
          resetForm();
        } else {
          setFormErrors({ submit: res.message || 'Failed to create user' });
        }
      } catch (err) {
        console.error(err);
        setFormErrors({ submit: 'Failed to create user' });
      } finally {
        setFormLoading(false);
      }
    };

    const openEditUser = (user) => {
      setEditingUser(user);
      setUserForm({ name: user.name || '', email: user.email || '', password: '', role: user.role || 'user' });
      setFormErrors({});
      setShowEditUser(true);
    };

    const handleUpdateUser = async (e) => {
      e.preventDefault();
      const errors = validateUserForm(true);
      if (Object.keys(errors).length) {
        setFormErrors(errors);
        return;
      }
      if (!editingUser) return;
      setFormLoading(true);
      try {
        const payload = { name: userForm.name, email: userForm.email, role: userForm.role };
        // Only send password if provided
        if (userForm.password) payload.password = userForm.password;
        const res = await apiService.updateUser(editingUser.id, payload);
        if (res && res.success) {
          await loadUsers();
          setShowEditUser(false);
          setEditingUser(null);
          resetForm();
        } else {
          setFormErrors({ submit: res.message || 'Failed to update user' });
        }
      } catch (err) {
        console.error(err);
        setFormErrors({ submit: 'Failed to update user' });
      } finally {
        setFormLoading(false);
      }
    };

    const handleDeleteUser = async (user) => {
      if (!window.confirm(`Delete user ${user.email || user.name}?`)) return;
      try {
        setFormLoading(true);
        const res = await apiService.deleteUser(user.id);
        if (res && res.success) {
          await loadUsers();
        } else {
          alert(res.message || 'Failed to delete user');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to delete user');
      } finally {
        setFormLoading(false);
      }
    };

    const filteredUsers = users.filter(u => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (u.name || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s) || (u.role || '').toLowerCase().includes(s);
    });

    return (
      <div className="content-area">
        <div className="content-header">
          <h1>User Management</h1>
         
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }}
            />
            <button className="action-btn" onClick={() => { resetForm(); setShowAddUser(true); }}>
              <CheckCircle size={14} /> Add User
            </button>
          </div>
        </div>

        <div className="info-card" style={{ padding: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Users ({users.length})</strong>
            {loadingUsers && <span style={{ color: '#666' }}>Loading...</span>}
          </div>
          <div style={{ maxHeight: 420, overflow: 'auto' }}>
            {filteredUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f3f3' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>{u.email} • {u.role}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-small" onClick={() => openEditUser(u)}><Edit size={12} /> Edit</button>
                  <button className="btn-small delete-btn" onClick={() => handleDeleteUser(u)} disabled={formLoading}><Trash2 size={12} /> Delete</button>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div style={{ padding: 24, color: '#666' }}>
                No users found.
              </div>
            )}
          </div>
        </div>

        {/* Add User Modal */}
        {showAddUser && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <h3>Add New User</h3>
                <button className="close-btn" onClick={() => { setShowAddUser(false); resetForm(); }}><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateUser} style={{ padding: 16 }}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={{ fontWeight: 600 }}>Name *</label>
                    <input type="text" value={userForm.name} onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
                    {formErrors.name && <div style={{ color: '#ff4757', fontSize: 13 }}>{formErrors.name}</div>}
                  </div>
                  <div>
                    <label style={{ fontWeight: 600 }}>Email *</label>
                    <input type="email" value={userForm.email} onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
                    {formErrors.email && <div style={{ color: '#ff4757', fontSize: 13 }}>{formErrors.email}</div>}
                  </div>
                  <div>
                    <label style={{ fontWeight: 600 }}>Password *</label>
                    <input type="password" value={userForm.password} onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
                    {formErrors.password && <div style={{ color: '#ff4757', fontSize: 13 }}>{formErrors.password}</div>}
                  </div>
                  <div>
                    <label style={{ fontWeight: 600 }}>Role</label>
                    <select value={userForm.role} onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }}>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {formErrors.submit && <div style={{ color: '#ff4757' }}>{formErrors.submit}</div>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn-secondary" onClick={() => { setShowAddUser(false); resetForm(); }} disabled={formLoading}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={formLoading}>{formLoading ? 'Creating...' : 'Create User'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditUser && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <h3>Edit User</h3>
                <button className="close-btn" onClick={() => { setShowEditUser(false); setEditingUser(null); resetForm(); }}><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateUser} style={{ padding: 16 }}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={{ fontWeight: 600 }}>Name *</label>
                    <input type="text" value={userForm.name} onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
                    {formErrors.name && <div style={{ color: '#ff4757', fontSize: 13 }}>{formErrors.name}</div>}
                  </div>
                  <div>
                    <label style={{ fontWeight: 600 }}>Email *</label>
                    <input type="email" value={userForm.email} onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
                    {formErrors.email && <div style={{ color: '#ff4757', fontSize: 13 }}>{formErrors.email}</div>}
                  </div>
                  <div>
                    <label style={{ fontWeight: 600 }}>Password (leave blank to keep)</label>
                    <input type="password" value={userForm.password} onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
                    {formErrors.password && <div style={{ color: '#ff4757', fontSize: 13 }}>{formErrors.password}</div>}
                  </div>
                  <div>
                    <label style={{ fontWeight: 600 }}>Role</label>
                    <select value={userForm.role} onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }}>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {formErrors.submit && <div style={{ color: '#ff4757' }}>{formErrors.submit}</div>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn-secondary" onClick={() => { setShowEditUser(false); setEditingUser(null); resetForm(); }} disabled={formLoading}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={formLoading}>{formLoading ? 'Updating...' : 'Update User'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };
  // Animal Management Screen
  const AnimalManagementScreen = () => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingAnimal, setEditingAnimal] = useState(null);
    const [deletingAnimal, setDeletingAnimal] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    // Match animal table fields
    const [formData, setFormData] = useState({
      name: '',
      tag_number: '',
      breed: '',
      gender: 'female',
      birth_date: '',
      notes: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [formLoading, setFormLoading] = useState(false);

    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      // Clear error when user starts typing
      if (formErrors[name]) {
        setFormErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    };

    const validateForm = () => {
      const errors = {};
      if (!formData.name.trim()) errors.name = 'Cow name is required';
      if (!formData.tag_number.trim()) errors.tag_number = 'Tag number is required';
      // breed, gender, birth_date, notes are optional
      return errors;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      setFormLoading(true);
      try {
        // Send only relevant fields to backend
        const animalData = {
          name: formData.name,
          tag_number: formData.tag_number,
          breed: formData.breed,
          gender: formData.gender,
          birth_date: formData.birth_date,
          notes: formData.notes
        };
        const response = await apiService.addAnimal(animalData);
        if (response.success) {
          await loadDashboardData();
          // Reset form and close modal
          setFormData({
            name: '',
            tag_number: '',
            breed: '',
            gender: 'female',
            birth_date: '',
            notes: ''
          });
          setShowAddForm(false);
        } else {
          setFormErrors({ submit: response.message || 'Failed to add cow' });
        }
      } catch (error) {
        setFormErrors({ submit: 'Failed to add cow. Please try again.' });
      } finally {
        setFormLoading(false);
      }
    };

    // Edit animal functions
    const handleEditAnimal = (animal) => {
      setEditingAnimal(animal);
      setFormData({
        name: animal.name || '',
        tag_number: animal.tag_number || '',
        breed: animal.breed || '',
        gender: animal.gender || 'female',
        birth_date: animal.birth_date ? animal.birth_date.split('T')[0] : '',
        notes: animal.notes || animal.details || ''
      });
      setFormErrors({});
      setShowEditForm(true);
    };

    const handleUpdateAnimal = async (e) => {
      e.preventDefault();
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      setFormLoading(true);
      try {
        const animalData = {
          name: formData.name,
          tag_number: formData.tag_number,
          breed: formData.breed,
          gender: formData.gender,
          birth_date: formData.birth_date,
          notes: formData.notes
        };
        const response = await apiService.updateAnimal(editingAnimal.id, animalData);
        if (response.success) {
          await loadDashboardData();
          // Reset form and close modal
          setFormData({
            name: '',
            tag_number: '',
            breed: '',
            gender: 'female',
            birth_date: '',
            notes: ''
          });
          setShowEditForm(false);
          setEditingAnimal(null);
        } else {
          setFormErrors({ submit: response.message || 'Failed to update animal' });
        }
      } catch (error) {
        setFormErrors({ submit: 'Failed to update animal. Please try again.' });
      } finally {
        setFormLoading(false);
      }
    };

    // Delete animal functions
    const handleDeleteAnimal = (animal) => {
      setDeletingAnimal(animal);
      setShowDeleteConfirm(true);
    };

    const confirmDeleteAnimal = async () => {
      if (!deletingAnimal) return;
      
      setFormLoading(true);
      try {
        const response = await apiService.deleteAnimal(deletingAnimal.id);
        if (response.success) {
          await loadDashboardData();
          setShowDeleteConfirm(false);
          setDeletingAnimal(null);
        } else {
          alert('Failed to delete cow: ' + (response.message || 'Unknown error'));
        }
      } catch (error) {
        alert('Failed to delete cow. Please try again.');
      } finally {
        setFormLoading(false);
      }
    };

    const cancelDeleteAnimal = () => {
      setShowDeleteConfirm(false);
      setDeletingAnimal(null);
    };

    return (
      <div className="content-area">
        <div className="content-header">
          <h1>Cow Management</h1>
          <p>Monitor and manage tracked cows</p>
        </div>
        <div className="table-container">
          <div className="table-header">
            <h3>
              <GiCow className="cow-icon" />
              Tracked Cows
            </h3>
            <button className="action-btn" onClick={() => setShowAddForm(true)}>
              <CheckCircle size={16} />
              Add New Cow
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="search-container" style={{
            padding: '1rem 0',
            borderBottom: '1px solid #e9ecef',
            marginBottom: '1rem'
          }}>
            <div style={{
              position: 'relative',
              maxWidth: '400px'
            }}>
              <input
                type="text"
                placeholder="Search by name, tag number, breed..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3CB371'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
              <div style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#666'
              }}>
                <Search size={16} />
              </div>
            </div>
          </div>
          {/* Add Cow Modal */}
          {showAddForm && (
            <div className="modal-overlay" style={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div className="modal-content" style={{
                background: '#fff', borderRadius: '18px', boxShadow: '0 8px 32px rgba(60,60,60,0.18)', padding: '2.5rem 2rem', minWidth: 400, maxWidth: 480, width: '100%', position: 'relative', animation: 'fadeIn 0.3s',
              }}>
                <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Add New Cow</h3>
                  <button className="modal-close" onClick={() => setShowAddForm(false)} style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', color: '#888', marginLeft: 12 }}>&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="animal-form" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label htmlFor="name" style={{ fontWeight: 500 }}>Cow Name *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter cow name"
                        required
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc', fontSize: 15 }}
                      />
                      {formErrors.name && <span className="error-text" style={{ color: '#e74c3c', fontSize: 13 }}>{formErrors.name}</span>}
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label htmlFor="tag_number" style={{ fontWeight: 500 }}>Tag Number *</label>
                      <input
                        type="text"
                        id="tag_number"
                        name="tag_number"
                        value={formData.tag_number}
                        onChange={handleInputChange}
                        placeholder="e.g., COW001"
                        required
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc', fontSize: 15 }}
                      />
                      {formErrors.tag_number && <span className="error-text" style={{ color: '#e74c3c', fontSize: 13 }}>{formErrors.tag_number}</span>}
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label htmlFor="breed" style={{ fontWeight: 500 }}>Breed</label>
                      <input
                        type="text"
                        id="breed"
                        name="breed"
                        value={formData.breed || ''}
                        onChange={handleInputChange}
                        placeholder="e.g., Jersey"
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc', fontSize: 15 }}
                      />
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label htmlFor="gender" style={{ fontWeight: 500 }}>Gender</label>
                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc', fontSize: 15 }}
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label htmlFor="birth_date" style={{ fontWeight: 500 }}>Birth Date</label>
                      <input
                        type="date"
                        id="birth_date"
                        name="birth_date"
                        value={formData.birth_date || ''}
                        onChange={handleInputChange}
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc', fontSize: 15 }}
                      />
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2' }}>
                      <label htmlFor="notes" style={{ fontWeight: 500 }}>Notes</label>
                      <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes || ''}
                        onChange={handleInputChange}
                        placeholder="Additional details about the cow"
                        rows={2}
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc', fontSize: 15, resize: 'vertical' }}
                      />
                    </div>
                  </div>
                  {formErrors.submit && (
                    <div className="error-message" style={{ color: '#e74c3c', marginTop: 8, fontSize: 15 }}>{formErrors.submit}</div>
                  )}
                  <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowAddForm(false)}
                      disabled={formLoading}
                      style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#eee', color: '#333', fontWeight: 500, fontSize: 15, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={formLoading}
                      style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#3CB371', color: '#fff', fontWeight: 500, fontSize: 15, cursor: 'pointer', boxShadow: '0 2px 8px rgba(60,190,113,0.08)' }}
                    >
                      {formLoading ? 'Adding...' : 'Add Cow'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Cow Modal */}
          {showEditForm && (
            <div className="modal">
              <div className="modal-content" style={{ maxWidth: 520, border: 'none', borderRadius: 16, background: '#ffffff', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: 0 }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottom: '1px solid #eee' }}>
                  <h4 style={{ margin: 0, color: '#333', fontWeight: 600, fontSize: 18 }}>Edit Cow</h4>
                  <button className="modal-close" onClick={() => setShowEditForm(false)} style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', color: '#888', marginLeft: 12 }}>&times;</button>
                </div>
                <form onSubmit={handleUpdateAnimal} style={{ padding: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label htmlFor="edit_name" style={{ fontWeight: 500 }}>Name *</label>
                      <input
                        id="edit_name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        style={{ width: '100%', padding: '8px 12px', border: formErrors.name ? '1px solid #ff4757' : '1px solid #ddd', borderRadius: 8, marginTop: 4 }}
                        placeholder="Enter cow name"
                      />
                      {formErrors.name && <span style={{ color: '#ff4757', fontSize: 13 }}>{formErrors.name}</span>}
                    </div>
                    <div>
                      <label htmlFor="edit_tag_number" style={{ fontWeight: 500 }}>Tag Number *</label>
                      <input
                        id="edit_tag_number"
                        type="text"
                        value={formData.tag_number}
                        onChange={(e) => setFormData({...formData, tag_number: e.target.value})}
                        style={{ width: '100%', padding: '8px 12px', border: formErrors.tag_number ? '1px solid #ff4757' : '1px solid #ddd', borderRadius: 8, marginTop: 4 }}
                        placeholder="Enter tag number"
                      />
                      {formErrors.tag_number && <span style={{ color: '#ff4757', fontSize: 13 }}>{formErrors.tag_number}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label htmlFor="edit_breed" style={{ fontWeight: 500 }}>Breed</label>
                      <input
                        id="edit_breed"
                        type="text"
                        value={formData.breed}
                        onChange={(e) => setFormData({...formData, breed: e.target.value})}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, marginTop: 4 }}
                        placeholder="Enter breed"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit_gender" style={{ fontWeight: 500 }}>Gender</label>
                      <select
                        id="edit_gender"
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, marginTop: 4 }}
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label htmlFor="edit_birth_date" style={{ fontWeight: 500 }}>Birth Date</label>
                      <input
                        id="edit_birth_date"
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, marginTop: 4 }}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label htmlFor="edit_notes" style={{ fontWeight: 500 }}>Notes</label>
                    <textarea
                      id="edit_notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, marginTop: 4, minHeight: 80, resize: 'vertical' }}
                      placeholder="Enter any additional notes or details"
                    />
                  </div>
                  {formErrors.submit && <div style={{ color: '#ff4757', marginBottom: 16, fontSize: 14 }}>{formErrors.submit}</div>}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowEditForm(false)}
                      style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontWeight: 500, fontSize: 15, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={formLoading}
                      style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#3CB371', color: '#fff', fontWeight: 500, fontSize: 15, cursor: 'pointer', boxShadow: '0 2px 8px rgba(60,190,113,0.08)' }}
                    >
                      {formLoading ? 'Updating...' : 'Update Cow'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && deletingAnimal && (
            <div className="modal">
              <div className="modal-content" style={{ maxWidth: 420, border: 'none', borderRadius: 16, background: '#ffffff', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: 0 }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottom: '1px solid #eee' }}>
                  <h4 style={{ margin: 0, color: '#e74c3c', fontWeight: 600, fontSize: 18 }}>Delete Cow</h4>
                  <button className="modal-close" onClick={cancelDeleteAnimal} style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', color: '#888', marginLeft: 12 }}>&times;</button>
                </div>
                <div style={{ padding: 24 }}>
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ margin: '0 0 8px 0', color: '#333', fontSize: 16 }}>
                      Are you sure you want to delete this cow?
                    </p>
                    <div style={{ 
                      background: '#f8f9fa', 
                      padding: '12px 16px', 
                      borderRadius: 8, 
                      border: '1px solid #e9ecef',
                      marginTop: 12
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                        <GiCow size={16} style={{ marginRight: 8, color: '#e74c3c' }} />
                        <strong>{deletingAnimal.name}</strong>
                      </div>
                      <div style={{ fontSize: 14, color: '#666' }}>
                        Tag: {deletingAnimal.tag_number} | Breed: {deletingAnimal.breed || 'N/A'}
                      </div>
                    </div>
                    <p style={{ margin: '16px 0 0 0', fontSize: 14, color: '#e74c3c' }}>
                      <strong>Warning:</strong> This action cannot be undone.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={cancelDeleteAnimal}
                      style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontWeight: 500, fontSize: 15, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteAnimal}
                      disabled={formLoading}
                      style={{ 
                        padding: '8px 18px', 
                        borderRadius: 8, 
                        border: 'none', 
                        background: '#e74c3c', 
                        color: '#fff', 
                        fontWeight: 500, 
                        fontSize: 15, 
                        cursor: formLoading ? 'not-allowed' : 'pointer',
                        opacity: formLoading ? 0.7 : 1
                      }}
                    >
                      {formLoading ? 'Deleting...' : 'Delete Cow'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="table">
            <div className="table-row header">
              <div className="col">Cow</div>
              <div className="col">Tag Number</div>
              <div className="col">Breed</div>
              <div className="col">Gender</div>
              <div className="col">Birth Date</div>
              <div className="col">Each Details</div>
              {/* <div className="col">Map</div> */}
              <div className="col">Actions</div>
            </div>
            {dashboardData.animals
              .filter(animal => {
                if (!searchTerm) return true;
                const searchLower = searchTerm.toLowerCase();
                return (
                  animal.name?.toLowerCase().includes(searchLower) ||
                  animal.tag_number?.toLowerCase().includes(searchLower) ||
                  animal.breed?.toLowerCase().includes(searchLower) ||
                  animal.gender?.toLowerCase().includes(searchLower) ||
                  animal.notes?.toLowerCase().includes(searchLower)
                );
              })
              .map((animal) => {
              const cowName = animal.name;
              return (
                <div key={animal.id} className="table-row">
                  <div className="col animal-col">
                    <GiCow className="cow-row-icon" />
                    {cowName}
                  </div>
                  <div className="col">{animal.tag_number}</div>
                  <div className="col">{animal.breed}</div>
                  <div className="col">{animal.gender}</div>
                  <div className="col">{animal.birth_date ? new Date(animal.birth_date).toLocaleDateString() : ''}</div>
                  <div className="col">{animal.details || animal.notes || ''}</div>
                  {/* <div className="col">
                    <button className="icon-btn" title="View on Map">
                      <Map size={14} />
                    </button>
                  </div> */}
                  <div className="col">
                    <button 
                      className="icon-btn" 
                      title="Edit Cow"
                      onClick={() => handleEditAnimal(animal)}
                      style={{ marginRight: '5px' }}
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      className="icon-btn" 
                      title="Delete Cow"
                      onClick={() => handleDeleteAnimal(animal)}
                      style={{ 
                        marginLeft: '5px', 
                        color: '#e74c3c',
                        border: '1px solid #e74c3c'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
            {dashboardData.animals.length === 0 && (
              <div className="no-data">
                <p>No cows found. Add cows to start tracking.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  const AlertsScreen = () => {
    const [marking, setMarking] = useState(null);

    const handleMarkRead = async (alertId) => {
      try {
        setMarking(alertId);
        const res = await apiService.markAlertRead(alertId);
        if (res.success) {
          await loadDashboardData();
        }
      } catch (e) {
        console.error('Failed to mark alert as read', e);
        alert('Failed to mark alert as read.');
      } finally {
        setMarking(null);
      }
    };

    return (
    <div className="content-area">
      <div className="content-header">
        <h1>Alerts & Notifications</h1>
        <p>System alerts and monitoring notifications</p>
      </div>

      <div className="alerts-container">
        {[...dashboardData.alerts]
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .map((alert) => (
            <div key={alert.id} className={`alert-card ${alert.severity}`}>
              <div className="alert-header">
                <div className="alert-title">
                  <AlertTriangle size={18} />
                  <span className="alert-type">{alert.alert_type.replace('_', ' ')}</span>
                </div>
                <span className="alert-time">{new Date(alert.timestamp).toLocaleString()}</span>
              </div>
              <p className="alert-message">{alert.message}</p>
              <div className="alert-actions">
                <button 
                  className="alert-btn primary"
                  onClick={() => handleViewAlertOnMap(alert)}
                >
                  <Map size={14} />
                  View on Map
                </button>
                {alert.status !== 'acknowledged' && alert.status !== 'resolved' && (
                  <button 
                    className="alert-btn secondary"
                    onClick={() => handleMarkRead(alert.id)}
                    disabled={marking === alert.id}
                  >
                    <CheckCircle size={14} />
                    {marking === alert.id ? 'Marking...' : 'Mark Read'}
                  </button>
                )}
              </div>
              <div style={{marginTop: 6, fontSize: 12, color: '#666'}}>
                Status: {alert.status}
              </div>
            </div>
          ))}

        {dashboardData.alerts.length === 0 && (
          <div className="no-alerts">
            <CheckCircle size={48} className="no-alerts-icon" />
            <h3>No Active Alerts</h3>
            <p>All systems are running normally</p>
          </div>
        )}
      </div>
    </div>
    );
  };

  // Analytics Screen
  const AnalyticsScreen = () => {
  // Prepare chart data
  const alertTrendData = processAlertTrendData(dashboardData.alerts, 7);
  const alertTypeData = processAlertTypeData(dashboardData.alerts);
  // healthData and breedData removed to avoid unused variable warnings; keep processing functions available if needed later
  const farmSummaryData = processFarmSummaryData(dashboardData);
  const monthlyActivityData = processMonthlyActivityData(dashboardData.animalLocations, 6);

    return (
      <div className="content-area">
        <div className="content-header">
          <h1>Analytics & Reports</h1>
          
        </div>

        <div className="analytics-grid">
          <div className="analytics-card">
            <h3><Bell size={20} /> Alert Trend (7 Days)</h3>
            <AreaChart data={alertTrendData} height={280} />
            <p className="chart-explanation">Number of alerts triggered each day for the past week. Use this to identify trends or spikes in farm issues.</p>
          </div>

          <div className="analytics-card">
            <h3><AlertTriangle size={20} /> Alert Types Distribution</h3>
            <PieChart data={alertTypeData} height={280} />
            <p className="chart-explanation">Breakdown of alert types (e.g., fence breach, health alert). Shows which issues are most common.</p>
          </div>

          <div className="analytics-card">
            <h3><BarChart3 size={20} /> Farm Overview</h3>
            <BarChart data={farmSummaryData} height={280} options={{ plugins: { legend: { display: false }}}} />
            <p className="chart-explanation">Summary of farm resources: total cows, active fences, recent alerts. Quick overview of farm status.</p>
          </div>

          <div className="analytics-card">
            <h3><Map size={20} /> Activity Over Time (6 Months)</h3>
            <LineChart data={monthlyActivityData} height={280} />
            <p className="chart-explanation">Cow movement and activity over the last 6 months. Useful for understanding seasonal or monthly patterns.</p>
          </div>
        </div>

        <div className="analytics-summary">
          <div className="summary-card">
            <h3>
              <BarChart3 size={20} />
              Farm Summary
            </h3>
            <div className="summary-stats">
              <div className="summary-item">
                <span className="summary-label">Total Cows:</span>
                <span className="summary-value">{dashboardData.animals.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Healthy cow:</span>
                <span className="summary-value text-green">
                  {dashboardData.animals.filter(a => a.health_status === 'healthy').length}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Active Fences:</span>
                <span className="summary-value text-blue">
                  {dashboardData.virtualFences.filter(f => f.is_active).length}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Recent Alerts:</span>
                <span className="summary-value text-orange">
                  {dashboardData.alerts.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Settings Screen
  const [geofenceAlerts, setGeofenceAlerts] = useState(true);
  const [healthMonitoring, setHealthMonitoring] = useState(true);
  const [batteryNotifications, setBatteryNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [satelliteView, setSatelliteView] = useState(true);

  // Example: use these states to control features in your app
  // You can add logic to enable/disable features based on these values

  const handleSwitch = (setter) => (e) => setter(e.target.checked);

  const SettingsScreen = () => (
    <div className="content-area">
      <div className="content-header">
        <h1>System Settings</h1>
        <p>Configure your virtual fence system</p>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <h3>
            <Home size={20} />
            Farm Settings
          </h3>
          <div className="setting-item">
            <label>Farm Name</label>
            <input type="text" defaultValue={dashboardData.farm?.name || ''} />
          </div>
          <div className="setting-item">
            <label>Location</label>
            <input type="text" defaultValue={dashboardData.farm?.location || ''} />
          </div>
          <div className="setting-item">
            <label>Farm Size (hectares)</label>
            <input type="number" defaultValue={dashboardData.farm?.size_hectares || 0} />
          </div>
        </div>

        <div className="settings-card">
          <h3>
            <Bell size={20} />
            Alert & Monitoring Settings
          </h3>
          <div className="setting-item">
            <label>Geofence Breach Alerts</label>
            <label className="switch">
              <input type="checkbox" checked={geofenceAlerts} onChange={handleSwitch(setGeofenceAlerts)} />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <label>Collar Battery Notifications</label>
            <label className="switch">
              <input type="checkbox" checked={batteryNotifications} onChange={handleSwitch(setBatteryNotifications)} />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-card">
          <h3>
            <Settings size={20} />
            System Configuration
          </h3>
          <div className="setting-item">
            <label>Data Auto-Refresh</label>
            <label className="switch">
              <input type="checkbox" checked={autoRefresh} onChange={handleSwitch(setAutoRefresh)} />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <label>Map Satellite View</label>
            <label className="switch">
              <input type="checkbox" checked={satelliteView} onChange={handleSwitch(setSatelliteView)} />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>
      {/* Add simple switch CSS for toggles */}
      <style>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          margin-left: 12px;
        }
        .switch input { display: none; }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #ccc;
          border-radius: 24px;
          transition: .4s;
        }
        .switch input:checked + .slider {
          background-color: #3CB371;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          border-radius: 50%;
          transition: .4s;
        }
        .switch input:checked + .slider:before {
          transform: translateX(20px);
        }
      `}</style>
    </div>
  );

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'map': return <MapScreen />;
      case 'collars': return <AnimalManagementScreen />;
      case 'alerts': return <AlertsScreen />;
      case 'users': return <UsersManagementScreen />;
      case 'analytics': return <AnalyticsScreen />;
      case 'settings': return <SettingsScreen />;
      default: return <DashboardScreen />;
    }
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <img src={logo} alt="Cattle Farm Logo" className="logo-image" />
            <h2>CATTLE FARM MONITORING</h2>
          </div>
          <p>Fence and monitor cattle Farm</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${currentScreen === id ? 'active' : ''}`}
              onClick={() => setCurrentScreen(id)}
            >
              <Icon size={20} className="nav-icon" />
              <span className="nav-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="user-info">
              <div className="user-avatar">
                <Users size={20} />
              </div>
              <div className="user-details">
                <strong>{user.name || user.email}</strong>
                <span>Farm Manager</span>
              </div>
            </div>
          )}
          {onLogout && (
            <button 
              className="logout-btn sidebar-logout" 
              onClick={onLogout}
              title="Sign Out"
            >
              <LogOut size={16} />
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content">
        {renderScreen()}
      </main>
    </div>
  );
};

export default App;
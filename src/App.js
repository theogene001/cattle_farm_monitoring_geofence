// src/App.js - Updated to use Backend API with Chart Components
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  Home, 
  Map, 
  Users, 
  Bell, 
  BarChart3, 
  Settings,
  AlertTriangle,
  CheckCircle,
  Activity,
  Heart,
  RefreshCw
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './App.css';
import logo from './img/logo.jpg';
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
  processFarmSummaryData
} from './components/charts/chartDataUtils';

// Create custom icon for markers
const createCustomIcon = (color = '#3CB371') => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const App = ({ user }) => {
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

  // Farm coordinates (example: Springfield, IL area)
  const farmCenter = [39.7817, -89.6501];

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

  // Navigation items with Lucide icons
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'map', label: 'Farm Map', icon: Map },
    { id: 'collars', label: 'Cow Management', icon: Users },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Dashboard Screen
  const DashboardScreen = () => (
    <div className="content-area">
      <div className="content-header">
        <h1>Farm Dashboard</h1>
        <p>Virtual Cattle Farm Fence - {dashboardData.farm?.name || 'Loading...'}</p>
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
            <Users size={24} />
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
          <Heart size={20} />
          Animal Status Overview
        </h3>
        <div className="animals-grid">
          {dashboardData.animals.map((animal) => (
            <div key={animal.id} className="animal-status">
              <div className="animal-avatar">
                <Heart size={20} />
              </div>
              <div className="animal-details">
                <strong>{animal.name}</strong>
                <span>Tag: {animal.tag_number}</span>
              </div>
              <div className="status-badge">
                <span className={`status ${animal.health_status}`}>
                  {animal.health_status}
                </span>
              </div>
            </div>
          ))}
        </div>
        {dashboardData.animals.length === 0 && (
          <p className="no-data">No animals found</p>
        )}
      </div>
    </div>
  );

  // Map Screen with Satellite View
  const MapScreen = () => (
    <div className="content-area">
      <div className="content-header">
        <h1>Live Farm Map</h1>
        <p>Real-time satellite view with virtual boundaries</p>
      </div>

      <div className="map-container">
        <MapContainer
          center={farmCenter}
          zoom={14}
          style={{ height: '500px', width: '100%' }}
          scrollWheelZoom={true}
        >
          {/* Satellite Tile Layer */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          />
          
          {/* Virtual Fence Boundaries */}
          {dashboardData.virtualFences.map((fence) => (
            <Circle
              key={fence.id}
              center={[fence.center_latitude, fence.center_longitude]}
              radius={fence.radius_meters}
              pathOptions={{
                color: fence.is_active ? '#3CB371' : '#FF6B6B',
                fillColor: fence.is_active ? '#3CB371' : '#FF6B6B',
                fillOpacity: 0.1,
                weight: 2
              }}
            >
              <Popup>
                <div className="fence-popup">
                  <h4>{fence.name}</h4>
                  <p>Status: {fence.is_active ? 'Active' : 'Inactive'}</p>
                  <p>Radius: {(fence.radius_meters / 1000).toFixed(1)} km</p>
                </div>
              </Popup>
            </Circle>
          ))}
          
          {/* Animal Markers */}
          {dashboardData.animalLocations.map((location) => {
            const animal = dashboardData.animals.find(a => a.id === location.animal_id);
            return (
              <Marker 
                key={location.id} 
                position={[location.latitude, location.longitude]}
                icon={createCustomIcon(animal?.health_status === 'healthy' ? '#3CB371' : '#FF6B6B')}
              >
                <Popup>
                  <div className="animal-popup">
                    <h4>
                      <Heart size={16} />
                      {animal?.name || 'Unknown Animal'}
                    </h4>
                    <p><strong>Tag:</strong> {animal?.tag_number}</p>
                    <p><strong>Status:</strong> {animal?.health_status}</p>
                    <p><strong>Last Update:</strong> {new Date(location.timestamp).toLocaleTimeString()}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div className="map-legend">
          <h4>Map Legend</h4>
          <div className="legend-item">
            <div className="legend-color green"></div>
            <span>Virtual Fence Boundary</span>
          </div>
          <div className="legend-item">
            <div className="legend-color blue"></div>
            <span>Animal Location</span>
          </div>
          <div className="legend-item">
            <div className="legend-color red"></div>
            <span>Health Alert</span>
          </div>
        </div>
      </div>

      <div className="map-stats">
        <div className="stat-item">
          <strong>{dashboardData.animals.length}</strong>
          <span>Animals Tracked</span>
        </div>
        <div className="stat-item">
          <strong>{dashboardData.virtualFences.length}</strong>
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
    </div>
  );

  // Animal Management Screen
  const AnimalManagementScreen = () => {
    const [showAddForm, setShowAddForm] = useState(false);
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
          setFormErrors({ submit: response.message || 'Failed to add animal' });
        }
      } catch (error) {
        setFormErrors({ submit: 'Failed to add animal. Please try again.' });
      } finally {
        setFormLoading(false);
      }
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
              <Users size={20} />
              Tracked Cows
            </h3>
            <button className="action-btn" onClick={() => setShowAddForm(true)}>
              <CheckCircle size={16} />
              Add New Cow
            </button>
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
          <div className="table">
            <div className="table-row header">
              <div className="col">Cow</div>
              <div className="col">Tag Number</div>
              <div className="col">Breed</div>
              <div className="col">Gender</div>
              <div className="col">Birth Date</div>
              <div className="col">Each Details</div>
              {/* Removed Last Location column */}
              <div className="col">Actions</div>
            </div>
            {dashboardData.animals.map((animal) => {
              const cowName = animal.name;
              return (
                <div key={animal.id} className="table-row">
                  <div className="col animal-col">
                    <Heart size={18} />
                    {cowName}
                  </div>
                  <div className="col">{animal.tag_number}</div>
                  <div className="col">{animal.breed}</div>
                  <div className="col">{animal.gender}</div>
                  <div className="col">{animal.birth_date ? new Date(animal.birth_date).toLocaleDateString() : ''}</div>
                  <div className="col">{animal.details || animal.notes || ''}</div>
                  <div className="col">
                    <button className="icon-btn" title="View on Map">
                      <Map size={14} />
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
  const AlertsScreen = () => (
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
                <button className="alert-btn primary">
                  <Map size={14} />
                  View on Map
                </button>
                <button className="alert-btn secondary">
                  <CheckCircle size={14} />
                  Mark Resolved
                </button>
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

  // Analytics Screen
  const AnalyticsScreen = () => {
    // Prepare chart data
    const alertTrendData = processAlertTrendData(dashboardData.alerts, 7);
    const alertTypeData = processAlertTypeData(dashboardData.alerts);
    const farmSummaryData = processFarmSummaryData(dashboardData);
    const monthlyActivityData = processMonthlyActivityData(dashboardData.animalLocations, 6);

    return (
      <div className="content-area">
        <div className="content-header">
          <h1>Analytics & Reports</h1>
          <p>Farm performance and animal behavior insights</p>
        </div>

        <div className="analytics-grid">
          

          <div className="analytics-card">
            <h3>
              <Bell size={20} />
              Alert Trend (7 Days)
            </h3>
            <AreaChart 
              data={alertTrendData} 
              height={280}
            />
          </div>

          <div className="analytics-card">
            <h3>
              <AlertTriangle size={20} />
              Alert Types Distribution
            </h3>
            <PieChart 
              data={alertTypeData} 
              height={280}
            />
          </div>

          <div className="analytics-card">
            <h3>
              <BarChart3 size={20} />
              Farm Overview
            </h3>
            <BarChart 
              data={farmSummaryData} 
              height={280}
              options={{
                plugins: {
                  legend: {
                    display: false
                  }
                }
              }}
            />
          </div>

          <div className="analytics-card">
            <h3>
              <Map size={20} />
              Activity Over Time (6 Months)
            </h3>
            <LineChart 
              data={monthlyActivityData} 
              height={280}
            />
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
                <span className="summary-label">Healthy Animals:</span>
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
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <label>Health Monitoring</label>
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <label>Collar Battery Notifications</label>
            <label className="switch">
              <input type="checkbox" defaultChecked />
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
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <label>Map Satellite View</label>
            <label className="switch">
              <input type="checkbox" defaultChecked />
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
          <p>Virtual Fence System</p>
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
                <strong>{user.email}</strong>
                <span>Farm Manager</span>
              </div>
            </div>
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
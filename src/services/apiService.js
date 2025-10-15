// API Service for Cattle Farm Monitoring Frontend
// Default to the deployed Render URL, but allow overriding with REACT_APP_API_URL
const DEFAULT_API_URL = 'https://cattle-farm-monitoring-backend.onrender.com/api/v1';
const API_BASE_URL = process.env.REACT_APP_API_URL || DEFAULT_API_URL;

class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Get authentication token
  getToken() {
    return this.token || localStorage.getItem('authToken');
  }

  // Make HTTP request with proper headers
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authorization header if token exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Debug: log Authorization header when in development to help diagnose 401/403
    if (process.env.NODE_ENV !== 'production') {
      console.debug('API request', endpoint, 'Authorization:', config.headers.Authorization);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT/PATCH request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Authentication
  async login(email, password) {
    console.log('🔗 API Service: Making login request to', `${API_BASE_URL}/auth/login`);
    try {
      const response = await this.post('/auth/login', { email, password });
      console.log('🔗 API Service: Login response received', response);
      
      if (response.success && response.data.token) {
        this.setToken(response.data.token);
        console.log('🔗 API Service: Token saved successfully');
      }
      return response;
    } catch (error) {
      console.error('🔗 API Service: Login request failed', error);
      throw error;
    }
  }

  logout() {
    this.setToken(null);
    localStorage.clear();
  }

  // Dashboard data
  async getDashboardSummary() {
    return this.get('/dashboard/summary');
  }

  async getAnimals() {
    return this.get('/dashboard/animals');
  }

  async getAnimalById(id) {
    return this.get(`/dashboard/animals/${id}`);
  }

  async getVirtualFences() {
    return this.get('/dashboard/fences');
  }

  async createVirtualFence(data) {
    return this.post('/dashboard/fences', data);
  }

  async updateVirtualFence(id, data) {
    return this.put(`/dashboard/fences/${id}`, data);
  }

  async deleteVirtualFence(id) {
    return this.delete(`/dashboard/fences/${id}`);
  }

  async getAnimalLocations() {
    return this.get('/dashboard/locations');
  }

  // Users management
  async getUsers() {
    return this.get('/users');
  }

  async createUser(data) {
    return this.post('/users', data);
  }

  async updateUser(id, data) {
    return this.put(`/users/${id}`, data);
  }

  async deleteUser(id) {
    return this.delete(`/users/${id}`);
  }

  async updateAnimalLocation(animalId, data) {
    return this.post(`/dashboard/animals/${animalId}/location`, data);
  }

  async getAnimalLocationHistory(animalId, limit = 100) {
    return this.get(`/dashboard/animals/${animalId}/location-history?limit=${limit}`);
  }

  async getAlerts() {
    return this.get('/alerts');
  }

  async markAlertRead(id) {
    return this.patch(`/alerts/${id}/read`, {});
  }

  // Animals - create
  async addAnimal(data) {
    return this.post('/dashboard/animals', data);
  }

  async updateAnimal(id, data) {
    return this.put(`/dashboard/animals/${id}`, data);
  }

  async deleteAnimal(id) {
    return this.delete(`/dashboard/animals/${id}`);
  }

  async resolveAlert(id) {
    return this.patch(`/alerts/${id}/resolve`, {});
  }

  // Utility methods
  async healthCheck() {
    return this.get('/health');
  }

  isAuthenticated() {
    return !!this.getToken();
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
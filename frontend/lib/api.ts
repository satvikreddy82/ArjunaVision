import axios from "axios";

// Always use /api so Next.js proxies requests to the backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/auth/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: (email: string, password: string, name: string) =>
    api.post("/auth/register", { email, password, name }),
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  me: () => api.get("/auth/me"),
};

// Users / Profile
export const usersAPI = {
  getProfile: () => api.get("/users/me"),
  updateProfile: (data: Record<string, unknown>) => api.put("/users/me", data),
};

// Contacts
export const contactsAPI = {
  list: () => api.get("/contacts"),
  create: (data: Record<string, unknown>) => api.post("/contacts", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
};

// Emergency
export const emergencyAPI = {
  trigger: (data: Record<string, unknown>) => api.post("/emergency/trigger", data),
  active: () => api.get("/emergency/active"),
  cancel: (id: string, reason?: string) =>
    api.post(`/emergency/${id}/cancel`, { reason }),
  history: () => api.get("/emergency/history"),
};

// Location
export const locationAPI = {
  update: (lat: number, lng: number, address?: string) =>
    api.post("/location", { latitude: lat, longitude: lng, address, source: "GPS" }),
  current: () => api.get("/location/current"),
  history: (hours = 24) => api.get(`/location/history?hours=${hours}`),
};

// Health
export const healthAPI = {
  addReading: (data: Record<string, unknown>) => api.post("/health/readings", data),
  readings: (hours = 24) => api.get(`/health/readings?hours=${hours}`),
  baseline: () => api.get("/health/baseline"),
  anomalies: () => api.get("/health/anomalies"),
};

// Risk
export const riskAPI = {
  analyze: (signals: Record<string, unknown>) => api.post("/risk/analyze", signals),
  current: () => api.get("/risk/current"),
};

// Simulation
export const simulationAPI = {
  scenarios: () => api.get("/simulation/scenarios"),
  run: (scenario: string, lat?: number, lng?: number) =>
    api.post("/simulation/run", { scenario, latitude: lat, longitude: lng }),
  seedDemoData: () => api.post("/simulation/seed-demo-data"),
};

// Facilities
export const facilitiesAPI = {
  nearby: (lat?: number, lng?: number) =>
    api.get(`/facilities/nearby${lat ? `?lat=${lat}&lng=${lng}` : ""}`),
};

// Notifications
export const notificationsAPI = {
  list: () => api.get("/notifications"),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
};

// Privacy
export const privacyAPI = {
  get: () => api.get("/privacy"),
  update: (data: Record<string, unknown>) => api.put("/privacy", data),
};

// Safe Routes
export const routesAPI = {
  list: () => api.get("/routes"),
  create: (data: Record<string, unknown>) => api.post("/routes", data),
};

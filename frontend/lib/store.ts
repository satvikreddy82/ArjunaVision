"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─────────── Types ────────────────────────────────────────────────
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SafetyStatus = "SAFE" | "MONITORING" | "ATTENTION" | "HIGH_RISK" | "EMERGENCY";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  blood_group?: string;
  allergies?: string;
  emergency_phrase?: string;
  safety_sensitivity?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
  timestamp: string;
  is_last_known?: boolean;
  available?: boolean;
}

export interface HealthReading {
  id?: string;
  heart_rate?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  blood_oxygen?: number;
  steps?: number;
  activity_level?: string;
  is_anomaly?: boolean;
  anomaly_type?: string;
  timestamp?: string;
}

export interface RiskAssessment {
  risk_score: number;
  risk_level: RiskLevel;
  reasons: string[];
  recommended_action: string;
  timestamp?: string;
}

export interface EmergencyEvent {
  event_id?: string;
  trigger?: string;
  status: string;
  risk_score?: number;
  risk_level?: RiskLevel;
  reasons?: string[];
  latitude?: number | null;
  longitude?: number | null;
  last_known_latitude?: number | null;
  last_known_longitude?: number | null;
  address?: string;
  started_at?: string;
  gps_available?: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  priority?: number;
  notify_on_emergency?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  body?: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// ─────────── Store ────────────────────────────────────────────────
interface GuardianStore {
  // Auth
  isAuthenticated: boolean;
  accessToken: string | null;
  user: UserProfile | null;
  setAuth: (token: string, user: UserProfile) => void;
  clearAuth: () => void;

  // Safety
  safetyStatus: SafetyStatus;
  setSafetyStatus: (s: SafetyStatus) => void;

  // Location
  currentLocation: Location | null;
  locationHistory: Location[];
  setCurrentLocation: (loc: Location) => void;
  addLocationHistory: (loc: Location) => void;

  // Health
  latestHealthReading: HealthReading | null;
  healthHistory: HealthReading[];
  setLatestHealthReading: (r: HealthReading) => void;
  addHealthReading: (r: HealthReading) => void;

  // Risk
  currentRisk: RiskAssessment;
  setCurrentRisk: (r: RiskAssessment) => void;

  // Emergency
  activeEmergency: EmergencyEvent | null;
  emergencyHistory: EmergencyEvent[];
  setActiveEmergency: (e: EmergencyEvent | null) => void;
  addEmergencyHistory: (e: EmergencyEvent) => void;

  // Contacts
  emergencyContacts: EmergencyContact[];
  setEmergencyContacts: (c: EmergencyContact[]) => void;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (n: Notification[]) => void;
  addNotification: (n: Notification) => void;
  markNotificationRead: (id: string) => void;

  // Device
  isOnline: boolean;
  batteryLevel: number | null;
  setOnline: (v: boolean) => void;
  setBattery: (v: number | null) => void;

  // Voice SOS
  voiceActive: boolean;
  voiceText: string;
  setVoiceActive: (v: boolean) => void;
  setVoiceText: (t: string) => void;

  // Demo/Simulation
  isDemoMode: boolean;
  simulationRunning: boolean;
  simulationStep: number;
  simulationSteps: string[];
  setDemoMode: (v: boolean) => void;
  setSimulation: (running: boolean, step?: number, steps?: string[]) => void;
}

const DEFAULT_RISK: RiskAssessment = {
  risk_score: 8,
  risk_level: "LOW",
  reasons: ["All signals within normal range"],
  recommended_action: "Continue normal monitoring. Everything appears safe.",
};

export const useStore = create<GuardianStore>()(
  persist(
    (set, get) => ({
      // Auth
      isAuthenticated: false,
      accessToken: null,
      user: null,
      setAuth: (token, user) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", token);
        }
        set({ isAuthenticated: true, accessToken: token, user });
      },
      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
        set({
          isAuthenticated: false,
          accessToken: null,
          user: null,
          activeEmergency: null,
          currentRisk: DEFAULT_RISK,
          safetyStatus: "SAFE",
        });
      },

      // Safety
      safetyStatus: "SAFE",
      setSafetyStatus: (s) => set({ safetyStatus: s }),

      // Location
      currentLocation: null,
      locationHistory: [],
      setCurrentLocation: (loc) => set({ currentLocation: loc }),
      addLocationHistory: (loc) =>
        set((state) => ({
          locationHistory: [loc, ...state.locationHistory].slice(0, 500),
        })),

      // Health
      latestHealthReading: null,
      healthHistory: [],
      setLatestHealthReading: (r) => set({ latestHealthReading: r }),
      addHealthReading: (r) =>
        set((state) => ({
          latestHealthReading: r,
          healthHistory: [r, ...state.healthHistory].slice(0, 500),
        })),

      // Risk
      currentRisk: DEFAULT_RISK,
      setCurrentRisk: (r) => {
        const level = r.risk_level;
        const status: SafetyStatus =
          level === "CRITICAL" ? "EMERGENCY"
          : level === "HIGH" ? "HIGH_RISK"
          : level === "MEDIUM" ? "ATTENTION"
          : "SAFE";
        set({ currentRisk: r, safetyStatus: status });
      },

      // Emergency
      activeEmergency: null,
      emergencyHistory: [],
      setActiveEmergency: (e) => {
        set({ activeEmergency: e });
        if (e) set({ safetyStatus: "EMERGENCY" });
        else set({ safetyStatus: "SAFE" });
      },
      addEmergencyHistory: (e) =>
        set((state) => ({
          emergencyHistory: [e, ...state.emergencyHistory].slice(0, 100),
        })),

      // Contacts
      emergencyContacts: [],
      setEmergencyContacts: (c) => set({ emergencyContacts: c }),

      // Notifications
      notifications: [],
      unreadCount: 0,
      setNotifications: (n) =>
        set({ notifications: n, unreadCount: n.filter((x) => !x.is_read).length }),
      addNotification: (n) =>
        set((state) => ({
          notifications: [n, ...state.notifications],
          unreadCount: state.unreadCount + (n.is_read ? 0 : 1),
        })),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),

      // Device
      isOnline: true,
      batteryLevel: null,
      setOnline: (v) => set({ isOnline: v }),
      setBattery: (v) => set({ batteryLevel: v }),

      // Voice SOS
      voiceActive: false,
      voiceText: "",
      setVoiceActive: (v) => set({ voiceActive: v }),
      setVoiceText: (t) => set({ voiceText: t }),

      // Demo
      isDemoMode: false,
      simulationRunning: false,
      simulationStep: 0,
      simulationSteps: [],
      setDemoMode: (v) => set({ isDemoMode: v }),
      setSimulation: (running, step = 0, steps = []) =>
        set({ simulationRunning: running, simulationStep: step, simulationSteps: steps }),
    }),
    {
      name: "arjunavision-store",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        user: state.user,
        isDemoMode: state.isDemoMode,
      }),
    }
  )
);

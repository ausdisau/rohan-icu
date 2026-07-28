"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_ACCESSIBILITY_SETTINGS,
  type AccessibilitySettings,
} from "@/types/accessibility";

const STORAGE_KEY = "breathing-room-a11y";

type AccessibilityContextValue = {
  settings: AccessibilitySettings;
  updateSettings: (patch: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(
  null,
);

function readStored(): AccessibilitySettings {
  if (typeof window === "undefined") return DEFAULT_ACCESSIBILITY_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ACCESSIBILITY_SETTINGS;
    return { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...(JSON.parse(raw) as object) };
  } catch {
    return DEFAULT_ACCESSIBILITY_SETTINGS;
  }
}

function applyDocumentFlags(settings: AccessibilitySettings): void {
  const root = document.documentElement;
  root.dataset.reducedMotion = settings.reducedMotion ? "true" : "false";
  root.dataset.reducedSensory = settings.reducedSensory ? "true" : "false";
  root.dataset.captionsDefault = settings.captionsDefaultOn ? "true" : "false";
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(
    DEFAULT_ACCESSIBILITY_SETTINGS,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStored();
    setSettings(stored);
    applyDocumentFlags(stored);
    setHydrated(true);
  }, []);

  const updateSettings = useCallback((patch: Partial<AccessibilitySettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      applyDocumentFlags(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_ACCESSIBILITY_SETTINGS);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(DEFAULT_ACCESSIBILITY_SETTINGS),
    );
    applyDocumentFlags(DEFAULT_ACCESSIBILITY_SETTINGS);
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{ settings, updateSettings, resetSettings }}
    >
      <div data-a11y-hydrated={hydrated ? "true" : "false"}>{children}</div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibilitySettings(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error(
      "useAccessibilitySettings must be used within AccessibilityProvider",
    );
  }
  return ctx;
}

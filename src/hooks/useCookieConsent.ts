import { useCallback, useEffect, useState } from "react";

export const COOKIE_CONSENT_KEY = "chatpsi_cookie_consent";
export const COOKIE_CONSENT_VERSION = "1.0";

export interface CookieChoices {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

export interface CookieConsent {
  version: string;
  timestamp: string;
  choices: CookieChoices;
}

const DEFAULT_CHOICES: CookieChoices = {
  necessary: true,
  analytics: false,
  marketing: false,
};

function readConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(choices: CookieChoices): CookieConsent {
  const record: CookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    choices: { ...choices, necessary: true },
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
    window.dispatchEvent(new CustomEvent("chatpsi:consent-changed", { detail: record }));
  }
  return record;
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(() => readConsent());

  useEffect(() => {
    const handler = () => setConsent(readConsent());
    window.addEventListener("chatpsi:consent-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("chatpsi:consent-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const acceptAll = useCallback(() => {
    setConsent(writeConsent({ necessary: true, analytics: true, marketing: true }));
  }, []);

  const rejectNonEssential = useCallback(() => {
    setConsent(writeConsent({ necessary: true, analytics: false, marketing: false }));
  }, []);

  const savePreferences = useCallback((choices: Partial<CookieChoices>) => {
    setConsent(writeConsent({ ...DEFAULT_CHOICES, ...consent?.choices, ...choices, necessary: true }));
  }, [consent]);

  const resetConsent = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(COOKIE_CONSENT_KEY);
      window.dispatchEvent(new CustomEvent("chatpsi:consent-changed", { detail: null }));
    }
    setConsent(null);
  }, []);

  return {
    consent,
    hasConsented: consent !== null,
    choices: consent?.choices ?? DEFAULT_CHOICES,
    acceptAll,
    rejectNonEssential,
    savePreferences,
    resetConsent,
  };
}

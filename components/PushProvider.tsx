"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export type PushState =
  | "loading"
  | "unavailable" // not logged in, or notifications not set up on the site
  | "install" // iPhone: must be added to the Home Screen first
  | "unsupported" // browser can't do notifications (e.g. in-app browsers)
  | "blocked" // person said "Block" in the browser
  | "off"
  | "on"
  | "busy";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PushValue {
  state: PushState;
  canPrompt: boolean; // browser has never been asked, so a popup makes sense
  canInstall: boolean; // the browser can install the site as an app right now
  isAdmin: boolean;
  userId: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  install: () => Promise<void>;
  recheck: () => void;
}

const PushContext = createContext<PushValue>({
  state: "unavailable",
  canPrompt: false,
  canInstall: false,
  isAdmin: false,
  userId: null,
  enable: async () => {},
  disable: async () => {},
  install: async () => {},
  recheck: () => {},
});

export const usePush = () => useContext(PushContext);

function keyToBytes(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function saveToServer(sub: PushSubscription) {
  return fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
}

// Remembers when someone deliberately switched notifications off
const offKey = (userId: string) => `gy-push-off-${userId}`;

function readFlag(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeFlag(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // private mode: nothing to remember
  }
}

async function subscribeThisDevice(key: string) {
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) await navigator.serviceWorker.register("/sw.js");
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(key),
    }));
  const res = await saveToServer(sub);
  return res.ok;
}

export default function PushProvider({
  userId,
  isAdmin,
  children,
}: {
  userId: string | null;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<PushState>("loading");
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const busyRef = useRef(false);
  const stateRef = useRef<PushState>("loading");
  const evaluateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Android Chrome lets a site offer a one-tap "install as app"
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!userId || !PUBLIC_KEY) {
      setState("unavailable");
      evaluateRef.current = null;
      return;
    }
    const uid: string = userId;
    const key: string = PUBLIC_KEY;
    let cancelled = false;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

    const evaluate = async () => {
      if (busyRef.current) return;
      if (!supported) {
        if (!cancelled) setState(isIos && !standalone ? "install" : "unsupported");
        return;
      }
      setPermission(Notification.permission);
      if (Notification.permission === "denied") {
        if (!cancelled) setState("blocked");
        return;
      }
      try {
        if (Notification.permission === "granted") {
          // Already allowed on this device. Unless they switched it off on purpose,
          // quietly connect this device to the logged-in account.
          if (readFlag(offKey(uid)) === "1") {
            if (!cancelled) setState("off");
            return;
          }
          const ok = await subscribeThisDevice(key);
          if (!cancelled && !busyRef.current) setState(ok ? "on" : "off");
        } else if (!cancelled) {
          setState("off");
        }
      } catch {
        if (!cancelled && !busyRef.current) setState("off");
      }
    };

    evaluateRef.current = evaluate;
    evaluate();

    // When someone comes back from changing the phone's settings, pick up the change
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const s = stateRef.current;
      if (s === "blocked" || s === "off") evaluate();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      evaluateRef.current = null;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [userId]);

  const enable = useCallback(async () => {
    if (!userId || !PUBLIC_KEY) return;
    busyRef.current = true;
    setState("busy");
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setState(result === "denied" ? "blocked" : "off");
        return;
      }
      const ok = await subscribeThisDevice(PUBLIC_KEY);
      if (ok) writeFlag(offKey(userId), null);
      setState(ok ? "on" : "off");
    } catch {
      setState("off");
    } finally {
      busyRef.current = false;
    }
  }, [userId]);

  const disable = useCallback(async () => {
    if (!userId) return;
    busyRef.current = true;
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      writeFlag(offKey(userId), "1");
    } finally {
      setState("off");
      busyRef.current = false;
    }
  }, [userId]);

  const install = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }, [installEvent]);

  const recheck = useCallback(() => {
    evaluateRef.current?.();
  }, []);

  const canPrompt = state === "off" && permission === "default";

  return (
    <PushContext.Provider
      value={{
        state,
        canPrompt,
        canInstall: installEvent !== null,
        isAdmin,
        userId,
        enable,
        disable,
        install,
        recheck,
      }}
    >
      {children}
    </PushContext.Provider>
  );
}

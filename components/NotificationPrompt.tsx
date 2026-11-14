"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePush } from "@/components/PushProvider";

const ASK_AGAIN_AFTER_DAYS = 7;

const dismissKey = (userId: string) => `gy-push-dismissed-${userId}`;

function recentlyDismissed(userId: string) {
  try {
    const at = Number(localStorage.getItem(dismissKey(userId)));
    return at > 0 && Date.now() - at < ASK_AGAIN_AFTER_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// Friendly one-tap popup, shown once someone is logged in and hasn't decided yet
export default function NotificationPrompt() {
  const { state, canPrompt, enable, isAdmin, userId } = usePush();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The Messages page has its own big switch, so don't double up there
  const eligible =
    !!userId && (canPrompt || state === "install") && !pathname.startsWith("/messages");

  useEffect(() => {
    if (!eligible || !userId || recentlyDismissed(userId)) return;
    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [eligible, userId]);

  const dismiss = useCallback(() => {
    if (userId) {
      try {
        localStorage.setItem(dismissKey(userId), String(Date.now()));
      } catch {
        // nothing to remember in private mode
      }
    }
    setOpen(false);
  }, [userId]);

  // Close by itself a moment after success
  useEffect(() => {
    if (open && state === "on") {
      const timer = setTimeout(() => setOpen(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [open, state]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!open) return null;

  let content: React.ReactNode;

  if (state === "on") {
    content = (
      <>
        <div className="text-4xl">✅</div>
        <h2 className="mt-3 text-lg font-semibold">You're all set</h2>
        <p className="mt-1 text-sm text-gray-600">We'll alert you the moment something arrives.</p>
      </>
    );
  } else if (state === "blocked") {
    content = (
      <>
        <div className="text-4xl">🔕</div>
        <h2 className="mt-3 text-lg font-semibold">No problem</h2>
        <p className="mt-1 text-sm text-gray-600">
          You can turn notifications on any time from the switch at the top of Messages.
        </p>
        <button onClick={dismiss} className="mt-5 w-full rounded-lg bg-black py-3 text-white">
          Close
        </button>
      </>
    );
  } else if (state === "install") {
    content = (
      <>
        <div className="text-4xl">📲</div>
        <h2 className="mt-3 text-lg font-semibold">Get alerts on your iPhone</h2>
        <p className="mt-1 text-sm text-gray-600">
          Tap the Share button, choose <b>Add to Home Screen</b>, then open Gari Yangu from your
          home screen and turn on notifications from Messages.
        </p>
        <button onClick={dismiss} className="mt-5 w-full rounded-lg bg-black py-3 text-white">
          Got it
        </button>
      </>
    );
  } else {
    content = (
      <>
        <div className="text-4xl">🔔</div>
        <h2 className="mt-3 text-lg font-semibold">Never miss a message</h2>
        <p className="mt-1 text-sm text-gray-600">
          Get an instant alert when a buyer, seller or dealer messages you
          {isAdmin ? ", and when a new listing needs your approval" : ""}. It works even when the
          site is closed.
        </p>
        <button
          onClick={enable}
          disabled={state === "busy"}
          className="mt-5 w-full rounded-lg bg-black py-3 text-base font-medium text-white disabled:opacity-60"
        >
          {state === "busy" ? "Waiting for your answer…" : "Turn on notifications"}
        </button>
        <button onClick={dismiss} className="mt-2 w-full py-2 text-sm text-gray-500">
          Not now
        </button>
        <p className="mt-1 text-xs text-gray-400">
          Your browser will ask you to confirm. Tap <b>Allow</b>.
        </p>
      </>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">{content}</div>
    </div>
  );
}

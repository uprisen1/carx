import webpush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export interface SubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function pushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

// Sends one notification to each device and reports what happened:
//  sent   - how many devices accepted it
//  dead   - endpoints that no longer exist (uninstalled / permission revoked)
//  errors - any other failure, with the push service's reason
export async function sendPushDetailed(subs: SubRow[], payload: PushPayload) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const dead: string[] = [];
  const errors: string[] = [];
  let sent = 0;

  if (!publicKey || !privateKey) {
    return { sent, dead, errors: ["Notification keys are missing on the server"] };
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    publicKey,
    privateKey
  );

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24, urgency: "high" }
        );
        sent += 1;
      } catch (err) {
        const e = err as { statusCode?: number; body?: string; message?: string };
        if (e.statusCode === 404 || e.statusCode === 410) {
          dead.push(s.endpoint);
        } else {
          errors.push(`${e.statusCode ?? ""} ${e.body ?? e.message ?? "failed"}`.trim());
        }
      }
    })
  );

  return { sent, dead, errors };
}

// Older helper kept for compatibility: returns only the dead endpoints
export async function sendPush(subs: SubRow[], payload: PushPayload) {
  const result = await sendPushDetailed(subs, payload);
  return result.dead;
}

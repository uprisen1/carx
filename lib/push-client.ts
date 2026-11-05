// Tells the server to send a push for something I just created.
// Fire-and-forget: a failure here must never break sending a message.
export function notifyServer(payload: { type: "message"; messageId: string } | { type: "listing"; listingId: string }) {
  fetch("/api/push/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

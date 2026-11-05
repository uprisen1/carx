import type { MetadataRoute } from "next";

// Lets people install the site on their phone's home screen
// (required for notifications on iPhone).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gari Yangu",
    short_name: "Gari Yangu",
    description: "Buy and sell cars in Kenya",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111111",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

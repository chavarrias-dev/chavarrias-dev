import type { MetadataRoute } from "next";
import { PWA_APP_ICON_TYPE, PWA_APP_ICON_URL } from "@/lib/pwa-app-icon";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chavarrias CRM",
    short_name: "Chavarrias",
    description: "CRM de Chavarrias Servicios Aduanales SA de CV",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    orientation: "portrait",
    icons: [
      {
        src: PWA_APP_ICON_URL,
        sizes: "72x72",
        type: PWA_APP_ICON_TYPE,
        purpose: "any",
      },
      {
        src: PWA_APP_ICON_URL,
        sizes: "96x96",
        type: PWA_APP_ICON_TYPE,
        purpose: "any",
      },
      {
        src: PWA_APP_ICON_URL,
        sizes: "128x128",
        type: PWA_APP_ICON_TYPE,
        purpose: "any",
      },
      {
        src: PWA_APP_ICON_URL,
        sizes: "144x144",
        type: PWA_APP_ICON_TYPE,
        purpose: "any",
      },
      {
        src: PWA_APP_ICON_URL,
        sizes: "152x152",
        type: PWA_APP_ICON_TYPE,
        purpose: "any",
      },
      {
        src: PWA_APP_ICON_URL,
        sizes: "192x192",
        type: PWA_APP_ICON_TYPE,
        purpose: "any",
      },
      {
        src: PWA_APP_ICON_URL,
        sizes: "384x384",
        type: PWA_APP_ICON_TYPE,
        purpose: "any",
      },
      {
        src: PWA_APP_ICON_URL,
        sizes: "512x512",
        type: PWA_APP_ICON_TYPE,
        purpose: "any",
      },
      {
        src: PWA_APP_ICON_URL,
        sizes: "512x512",
        type: PWA_APP_ICON_TYPE,
        purpose: "maskable",
      },
    ],
  };
}

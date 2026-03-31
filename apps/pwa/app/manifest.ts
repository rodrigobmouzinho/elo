import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?app=elo-pwa-v2",
    name: "Elo Networking",
    short_name: "Elo",
    description: "Conecte-se com empreendedores da comunidade Elo",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#131313",
    theme_color: "#131313",
    icons: [
      {
        src: "/elo-install-192-v2.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/elo-install-512-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/elo-install-maskable-192-v2.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/elo-install-maskable-512-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}

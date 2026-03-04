import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WavePipe Downloader",
    short_name: "WavePipe",
    description: "The ultimate open-source YouTube downloader.",
    start_url: "/",
    display: "standalone", // Esto quita la barra del navegador
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.ico", // Usamos el favicon por defecto por ahora
        sizes: "any",
        type: "image/x-icon",
      },
      // Aquí deberías poner tus logos reales (192x192 y 512x512) en el futuro
    ],
  };
}

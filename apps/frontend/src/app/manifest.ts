import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nisky",
    short_name: "Nisky",
    description: "Tu espacio para organizar el día, tareas, hábitos y notas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbf9fa",
    theme_color: "#303e51",
    orientation: "portrait-primary",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nueva tarea", short_name: "Tarea", url: "/tasks?modal=create", icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }] },
      { name: "Nueva nota", short_name: "Nota", url: "/knowledge?modal=create", icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }] },
    ],
  };
}

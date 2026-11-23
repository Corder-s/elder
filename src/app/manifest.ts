import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ElderCare OS - Old Age Home Management",
    short_name: "ElderCare OS",
    description: "A complete Old Age Home & Elderly Care Management System",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8FF",
    theme_color: "#6D28D9",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}

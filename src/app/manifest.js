const SITE_NAME = "SoldierHub";

export default function manifest() {
  return {
    name: "SoldierHub — Fort Bliss & El Paso Military Community",
    short_name: SITE_NAME,
    description:
      "Independent, unofficial Fort Bliss and El Paso military community platform for local questions, PCS help, BAH tools, gate information, and resources.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F6F3EC",
    theme_color: "#0B1C2C",
    categories: ["social", "lifestyle", "utilities"],
    lang: "en-US",
    dir: "ltr",
    icons: [
      {
        src: "/brand/soldierhub-icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/soldierhub-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/soldierhub-favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}

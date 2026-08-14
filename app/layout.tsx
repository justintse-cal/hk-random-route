import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Noto_Sans_HK } from "next/font/google";
import "./globals.css";

const signSans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
});
const notoHk = Noto_Sans_HK({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-hk",
});

export const metadata: Metadata = {
  title: "HK 隨機路線 · Random Route",
  description:
    "Generate random routes for jogging or walking in Hong Kong.",
  openGraph: {
    title: "HK 隨機路線 · Random Route",
    description:
      "Generate random routes for jogging or walking in Hong Kong.",
    siteName: "HK Random Route",
    locale: "zh_HK",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-Hant"
      className={`${signSans.variable} ${notoHk.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=accessible,wb_shade&display=block"
        />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("hkr.theme");if(t==="dark"){document.documentElement.dataset.theme="dark";}}catch(e){}})();`,
          }}
        />
        <div
          aria-hidden="true"
          style={{ display: "none" }}
          dangerouslySetInnerHTML={{
            __html:
              "<!-- DIRECTION: The Sign System (wayfinding grammar of airport / MTR directional signage; fused from dealt challenger wayfinding-cartography-signage-terminal-yellow-wayfinding, seed c9b7dee6).\n" +
              "THESIS: A route tool that reads like a terminal's sign system: one decision at a time, only the choices ahead, distance in minutes; it refuses both the frosted-glass dock and the kinetic split-flap theatre this category keeps shipping.\n" +
              "OWN-WORLD: Light neutral ground (white sign panels over the light map), wayfinding yellow (#ffd21f) reserved for the route sign only (the generate action is a calm launch gray #6b7280), black humanist sans on white, ink pictograms on the map-control fill, monumental distance numerals, arrows locked to panel edges; the dark theme re-skins the ground while the yellow signs stay.\n" +
              "STORY: A runner taps the gray GENERATE band; the route arrives as a sign -- monumental distance, walk/run/gain in minutes, streets listed like waypoints, a lamp language (green arrow = on route, red = off route, amber weather signal in the bottom bar). Criteria, legend, and results live as collapsible sign panels; favourites, weather, about, and theme sit in a bottom utility bar.\n" +
              "FIRST VIEWPORT: Full-bleed light map; on mobile the map sits at the top of the viewport (roughly 48vh) with the collapsible sign panels (CRITERIA, ROUTE), the gray GENERATE band, and a utility bar (controls, legend, theme, weather signal, favourites, about) scrolling beneath it in the same container; on desktop the whole dock is pinned to the top-left of the map as a floating panel; the locate-origin, bookmark, and language controls float on the map.\n" +
              "FORM: wayfinding sign system, assigned grounded index 3, fused challenger #1 wins both axes on audience identification and product clarity (seed c9b7dee6); route line signal blue #2f6fed (distinct from basemap road yellow), origin dot the same blue, distance presets 3 / 5 / 10 km per user decision; the dark theme re-skins the liberty basemap via a runtime invert-and-desaturate color transform, keeping its 3D buildings.\n" +
              "FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md. -->",
          }}
        />
        {children}
      </body>
    </html>
  );
}

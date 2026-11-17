// HeyTribe on Next.js. Website pages come from content/ (see src/lib/pages.js); the app, admin and sitter pages,
// styles, scripts and images are static files in public/. Security headers and redirects stay in vercel.json.
// Three Vercel projects build this repo: app (app.heytribe.app) holds every server key and runs the server functions;
// site (www.heytribe.app) and admin (admin.heytribe.app) set HT_API_ORIGIN=https://app.heytribe.app and pass their
// /api/... calls to it, so keys live in one project and every public address stays the same.
const API = (process.env.HT_API_ORIGIN || "").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
export default {
  // page addresses end in .html and the Spanish home is /es/, so don't add or strip trailing slashes
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  experimental: { globalNotFound: true },
  outputFileTracingIncludes: { "/**": ["./content/**/*.html"] },
  async rewrites() {
    return {
      beforeFiles: API ? [{ source: "/api/:path*", destination: `${API}/api/:path*` }] : [],
      afterFiles: [
        { source: "/app", destination: "/app/index.html" },
        { source: "/app/", destination: "/app/index.html" },
        { source: "/admin", destination: "/admin/index.html" },
        { source: "/admin/", destination: "/admin/index.html" },
        { source: "/sitter", destination: "/sitter/index.html" },
        { source: "/sitter/", destination: "/sitter/index.html" },
        { source: "/es/", destination: "/es" },
        { source: "/index.html", destination: "/" },
        { source: "/.well-known/apple-app-site-association", destination: `${API}/api/aasa` },
        { source: "/.well-known/assetlinks.json", destination: `${API}/api/assetlinks` }
      ],
      fallback: []
    };
  }
};

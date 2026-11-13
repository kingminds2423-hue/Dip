import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

const APP_VERSION = '2.7.0';
const DEFAULT_RELEASE_NOTES = [
  'নতুন গাঢ় সবুজ ও সোনালি রিংযুক্ত DB অ্যাপ লোগো ও দ্রুতগতির স্প্ল্যাশ স্ক্রিন',
  'অফলাইন ক্যাশ ও কোড-স্প্লিটিং-সহ সুপার-ফাস্ট অ্যাপ লোডিং',
  'Admin, Staff ও Share Partner-এর জন্য একীভূত Google Play Store ডাউনলোড ও ইনস্টল লিঙ্ক',
  'Google Play Store স্টাইলের স্বয়ংক্রিয় অটো-আপডেট ও রিয়েল-টাইম AI Studio সিঙ্ক সিস্টেম'
];

function createAutoUpdateBuildPlugin(buildId: string, buildTime: string): Plugin {
  const versionPayload = JSON.stringify(
    {
      version: APP_VERSION,
      buildId,
      buildTime,
      releaseNotes: DEFAULT_RELEASE_NOTES,
    },
    null,
    2
  );

  return {
    name: 'dip-bhola-auto-update-plugin',
    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.end(versionPayload);
      });

      server.middlewares.use('/manifest.json', (_req, res, next) => {
        const manifestPath = path.resolve(__dirname, 'public/manifest.json');
        if (fs.existsSync(manifestPath)) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.end(fs.readFileSync(manifestPath, 'utf-8'));
          return;
        }
        next();
      });

      server.middlewares.use('/sw.js', (_req, res, next) => {
        const swPath = path.resolve(__dirname, 'public/sw.js');
        if (fs.existsSync(swPath)) {
          const raw = fs.readFileSync(swPath, 'utf-8');
          const stamped = raw.replace(/__BUILD_ID__/g, buildId);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.end(stamped);
          return;
        }
        next();
      });
    },
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) return;

      try {
        fs.writeFileSync(path.join(distDir, 'version.json'), versionPayload, 'utf-8');
        const distSwPath = path.join(distDir, 'sw.js');
        if (fs.existsSync(distSwPath)) {
          const raw = fs.readFileSync(distSwPath, 'utf-8');
          fs.writeFileSync(distSwPath, raw.replace(/__BUILD_ID__/g, buildId), 'utf-8');
        }
      } catch (err) {
        console.warn('Auto-update manifest stamping warning:', err);
      }
    },
  };
}

export default defineConfig(() => {
  const buildId = `${APP_VERSION}-${Date.now()}`;
  const buildTime = new Date().toISOString();

  return {
    plugins: [react(), tailwindcss(), createAutoUpdateBuildPlugin(buildId, buildTime)],
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION),
      __APP_BUILD_ID__: JSON.stringify(buildId),
      __APP_BUILD_TIME__: JSON.stringify(buildTime),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

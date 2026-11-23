# Progressive Web App (PWA)

Predictify ships as an installable PWA with an offline shell.

## Manifest

`public/manifest.webmanifest` declares the app identity, `start_url: "/markets"`, standalone display, theme colour, and icons (192 × 192, 512 × 512 any/maskable).  
Referenced via `metadata.manifest` in `app/layout.tsx`.

## Service Worker (`public/sw.js`)

| Route | Strategy |
|---|---|
| `/offline`, icons, manifest | Precache on install |
| `/_next/static/**` | Stale-while-revalidate |
| `/markets/**` | Network-first with cache fallback |
| `/api/**` | Never cached |
| Non-GET | Never cached |

The SW is registered only in production (`process.env.NODE_ENV === 'production'`) by `components/pwa/ServiceWorkerRegistration.tsx`, mounted in `components/providers.tsx`.

`next.config.mjs` adds `Cache-Control: no-cache` for `/sw.js` so browsers always fetch the latest worker.

## Offline Page

`app/offline/page.tsx` renders a friendly offline state with a link back to `/markets`.

## Offline Banner

`components/pwa/OfflineBanner.tsx` listens to `window online/offline` events, renders a fixed red banner, and announces state changes through `announce()` from `hooks/use-global-live-region.ts` for assistive technology.

## Install Prompt

`hooks/useInstallPrompt.ts` captures `beforeinstallprompt`, exposes `{ canInstall, promptInstall }`. Safari and browsers that do not support the prompt return `"unavailable"` from `promptInstall()`.

## Testing

```bash
pnpm test -- components/pwa hooks/__tests__/useInstallPrompt.test.ts
```

Manual:
```bash
pnpm build && pnpm start
# DevTools → Application → Service Workers + toggle offline
```

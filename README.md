# ImageWrangler

**Privacy-First, Offline Browser Image Processing & Conversion Suite**

ImageWrangler is a **100% client-side, zero-telemetry** image utility that compresses, resizes, crops, and converts images directly inside your browser. No backends, no cloud uploads, no tracking scripts, and no external API dependencies. Built for photographers, designers, developers, and privacy-conscious users.

> 🔒 **Privacy Guarantee**: Your photos never leave your device. All decoding, compression, and transformations execute exclusively in volatile browser memory via Web Workers and HTML5 Canvas APIs. Once you close the tab, all memory is freed.

---

## 🌐 Live Application

🔗 **[https://imagewrangler.pages.dev/](https://imagewrangler.pages.dev/)**

---

## ✨ Key Features

### 🛡️ Privacy & Security Architecture
- **100% Client-Side**: Zero server-side processing, zero backend proxies, and zero third-party APIs.
- **Strict Content Security Policy (CSP)**: Hardened headers (`public/_headers`) enforce `default-src 'self'` with zero external asset or network requests.
- **Self-Hosted Assets**: Fonts are self-hosted via `@fontsource/inter` and `@fontsource/cormorant-garamond`. All UI icons are bundled as inline SVGs.
- **Memory Safety & Lifecycle Management**: All `blob:` and object URLs are tracked and systematically revoked on component unmount and file removal to prevent memory leaks.
- **Decompression Bomb Protection**: Enforces strict safety limits (`50MP` max canvas pixels, `100MB` file size, and `15,000 × 15,000 px` max dimensions).
- **Runtime Canvas Probing**: Automatically detects browser-specific canvas dimension ceilings (e.g. Safari’s 4096px threshold) to prevent blank canvas export bugs.

### 🖼️ Advanced Image Processing Engine
- **Format Conversion**: Convert seamlessly across **AVIF**, **WebP**, **JPEG**, **PNG**, and **BMP**.
- **AVIF Next-Gen Encoding**: Full ISOBMFF signature validation, lossy compression tuning, and browser canvas capability checks.
- **Custom BMP Writer**: Includes a built-in 24-bit RGB BMP encoder (`src/lib/bmpEncoder.ts`) to bypass inconsistent browser canvas BMP export support.
- **Dual Compression Modes**:
  - **Quality Slider (1–100%)**: Fine-tune lossy compression for JPEG, WebP, and AVIF.
  - **Target File Size (KB/MB)**: Automated binary-search canvas compression (8 iterations down to ±0.4% precision) to hit desired file weights without guesswork.
- **Intelligent Skip Guard**: If no format, dimension, crop, or quality reduction is requested, ImageWrangler passes through the original file unaltered to preserve untouched metadata.
- **Smart Aspect-Ratio Resizing**: Pixel-accurate dimension adjustments with live aspect-ratio locking.
- **Interactive 8-Handle Crop Tool**: Canvas crop editor with standard aspect ratio presets (Free, 1:1, 16:9, 9:16, 4:3, 3:2), touch-optimized boundary clamping, and keyboard accessibility (`Escape` to cancel).
- **Grid Image Merger**: Merges multiple loaded images into an optimal square-grid collage on a clean canvas for consolidated export.

### 🧵 Dedicated Web Worker Pipeline
- **Off-Thread Processing**: CPU-intensive decoding, resizing, and encoding run inside an isolated Web Worker (`src/workers/imageProcessor.worker.ts`), keeping the UI responsive at 60 FPS.
- **Sequential Validation & Decode**: Uploaded files are validated (magic byte signature verification, zero-byte detection, spoofing checks) and decoded one by one, ensuring a corrupt file never halts the remaining batch.
- **60-Second Watchdog & Worker Recovery**: The worker manager monitors job health. Any hung or crashed worker is automatically terminated and rebuilt, rejecting pending jobs gracefully rather than freezing.
- **Concurrency Limiter**: Limits simultaneous worker operations to preserve device RAM when manipulating high-resolution images.

### 🌓 Dual Theme & Editorial Aesthetics
- **Warm Editorial Aesthetic**: Crafted with a bespoke Claude-inspired color system (cream `#faf9f5` canvas, warm coral `#cc785c` accents, and deep ink `#141413` surfaces).
- **Dark Mode Support**: Seamless dark theme (`#141413` background, `#1f1e1b` card surfaces, `#d98266` coral accents) with synchronized `<meta name="theme-color">` and CSS-driven icon states to eliminate hydration flash.
- **Zero-FOUC Architecture**: Inline pre-render script reads `localStorage.theme` and OS `prefers-color-scheme` to apply theme classes before DOM paint.

### 📱 Responsive & Accessible UI (WCAG Compliant)
- **Fluid Layout**: Mobile-first responsive layout with dynamic container scaling (`1rem` on mobile, scaling up to `2rem` on desktop).
- **40px+ Touch Targets**: All interactive elements (theme toggle, language dropdown, modal close buttons, crop controls, card actions) meet WCAG 2.5.5 minimum touch targets.
- **Dynamic Viewport Height**: Modals and full-screen tools utilize dynamic `dvh` with `vh` fallbacks (`.max-h-crop`, `.max-h-preview`, `.max-h-preview-body`) to prevent cutoff by mobile browser navigation bars.
- **Floating Action Button (FAB)**: Provides quick mobile thumb access to select, download, ZIP, merge, and clear actions.

### 🌍 Multi-Language Internationalization (i18n)
- **8 Supported Locales**:
  - 🇺🇸 English (`en`)
  - 🇪🇸 Spanish (`es`)
  - 🇫🇷 French (`fr`)
  - 🇩🇪 German (`de`)
  - 🇮🇳 Hindi (`hi`)
  - 🇯🇵 Japanese (`ja`)
  - 🇨🇳 Chinese (`zh`)
  - 🇧🇷 Portuguese (`pt`)
- **Reactive Store**: Built using React’s `useSyncExternalStore` for instantaneous language switching across components with zero re-render lag.
- **Accessibility & SEO Sync**: Automatically synchronizes `<html lang="...">` on language change.
- **Persistent Preferences**: Saves chosen language in `localStorage`.

### 📦 Export Options
- **Individual File Downloads**: Download single processed images with sanitized filenames.
- **ZIP Archive Export**: Bundle selected or all processed images into a clean `.zip` archive via JSZip.
- **Filename Sanitization**: Automatically strips path traversals, control characters, and reserved system characters from filenames prior to export.

---

## 🛠️ Supported Image Formats

| Format | Import | Export | Encoding Engine | Notes |
| :----- | :----: | :----: | :-------------- | :---- |
| **JPEG** | ✅ | ✅ | Canvas Lossy | Full quality slider & target KB binary search |
| **PNG** | ✅ | ✅ | Canvas Lossless | Preserves transparency |
| **WebP** | ✅ | ✅ | Canvas Lossy / Lossless | Superior modern web compression |
| **AVIF** | ✅ | ✅ | Canvas Lossy | Next-gen compression *(in supporting browsers)* |
| **BMP** | ✅ | ✅ | Custom 24-bit RGB Encoder | Client-side array buffer encoder (`bmpEncoder.ts`) |

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                      Client UI                         │
│  (Astro Static Shell + React 19 + Tailwind CSS)        │
│                                                        │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────┐  │
│  │ ImageDropzone│   │  ImageCard   │   │  CropTool  │  │
│  └──────┬───────┘   └──────┬───────┘   └─────┬──────┘  │
│         │                  │                 │         │
│         ▼                  ▼                 ▼         │
│  ┌──────────────────────────────────────────────────┐  │
│  │             useSyncExternalStore                 │  │
│  │         (i18n, Theme State, Queue State)         │  │
│  └─────────────────────────┬────────────────────────┘  │
└────────────────────────────┼───────────────────────────┘
                             │
                  postMessage (Single Worker)
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│                   Web Worker Realm                     │
│            (imageProcessor.worker.ts)                  │
│                                                        │
│  ┌─────────────────────────┐ ┌──────────────────────┐  │
│  │   Magic Byte Validator  │ │ 60s Watchdog & Queue │  │
│  │  (Decompression Bomb)   │ │  Concurrency Control │  │
│  └────────────┬────────────┘ └──────────┬───────────┘  │
│               │                         │              │
│               ▼                         ▼              │
│  ┌──────────────────────────────────────────────────┐  │
│  │     OffscreenCanvas Image Processing Pipeline    │  │
│  │      (Resize / Crop / Compress / Binary Search)  │  │
│  └─────────────────────────┬────────────────────────┘  │
│                            │                           │
│                            ▼                           │
│             Output Blob (AVIF, WebP, JPG, PNG, BMP)    │
└────────────────────────────────────────────────────────┘
```

---

## 💻 Tech Stack

- **Framework**: [Astro](https://astro.build/) (Static Site Generation, zero runtime JS shell)
- **UI & Logic**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Design system tokens, custom utilities)
- **Archiving**: [JSZip](https://stuk.github.io/jszip/) (Client-side ZIP generation)
- **Typography**: Self-hosted `@fontsource/inter` and `@fontsource/cormorant-garamond`
- **Icons**: Curated inline SVG library (Coolicons, Tabler Icons, Remix Icon)

---

## 📁 Repository Structure

```
imagewrangler/
├── public/
│   ├── _headers             # Cloudflare Pages CSP, security, and cache headers
│   ├── favicon.svg          # Branded vector squircle favicon
│   ├── robots.txt           # Crawler instructions
│   ├── sitemap-index.xml    # Search engine sitemap
│   └── *.png, *.svg         # Local donation badges and fallbacks
├── src/
│   ├── components/          # Interactive React components
│   │   ├── CropTool.tsx     # 8-handle touch-friendly crop editor
│   │   ├── FAQ.tsx          # Accessible multilingual FAQ accordion
│   │   ├── FloatingActionButton.tsx # Quick-action mobile action menu
│   │   ├── Header.tsx       # Header with theme toggle & i18n switcher
│   │   ├── ImageCard.tsx    # Per-image controls, resize inputs, & preview modal
│   │   ├── ImageDropzone.tsx# Drag & drop upload area with paste support
│   │   ├── ImageWrangler.tsx# Central application coordinator & batch actions
│   │   └── icons.tsx        # Zero-dependency inline SVG icon library
│   ├── layouts/
│   │   └── Layout.astro     # HTML document shell, JSON-LD schema, & theme script
│   ├── lib/
│   │   ├── bmpEncoder.ts    # Pure JavaScript 24-bit RGB BMP encoder
│   │   ├── fileValidation.ts# File signatures, magic bytes, & bomb protection
│   │   ├── i18n.ts          # 8-language dictionary and useTranslation store
│   │   ├── imageProcessor.ts# Canvas resize, compression, & merge logic
│   │   ├── types.ts         # Shared TypeScript interfaces & security constants
│   │   ├── utils.ts         # Formatting, class merging, and ID generation
│   │   └── workerManager.ts # Web Worker pool, watchdog, & concurrency queue
│   ├── pages/
│   │   └── index.astro      # Application entrypoint
│   ├── styles/
│   │   └── global.css       # Tailwind directives, theme variables, & utilities
│   └── workers/
│       └── imageProcessor.worker.ts # Off-thread image processing worker
├── astro.config.mjs         # Astro site and integration config
├── package.json             # Scripts and dependencies
├── tailwind.config.ts       # Tailwind theme colors and responsive scales
└── tsconfig.json            # Strict TypeScript configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Package Manager**: npm, pnpm, or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Ashutoshgit47/ImageWrangler.git

# Navigate into the project directory
cd ImageWrangler

# Install dependencies
npm install
```

### Local Development

```bash
# Start local development server with hot-reload
npm run dev
```

Visit `http://localhost:4321` in your browser.

### Type & Quality Checks

```bash
# Run Astro diagnostics
npm run check

# Run strict TypeScript compiler verification
npm run typecheck
```

### Production Build

```bash
# Build production bundle to /dist
npm run build

# Preview production build locally
npm run preview
```

---

## 🔒 Security & Privacy Policy

ImageWrangler operates strictly on a **zero-trust, local-first** principle:
1. No telemetry or analytics SDKs are included in the bundle.
2. No cookies are stored or requested.
3. No user images or file names are ever transmitted across a network.
4. All worker pipelines execute in sandboxed browser contexts.

---

## 👨‍💻 Author

**Ashutosh Gautam**
- GitHub: [@Ashutoshgit47](https://github.com/Ashutoshgit47)
- Portfolio: [ashutosh47.pages.dev](https://ashutosh47.pages.dev/)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

# ImageWrangler 

**Privacy-First, Browser-Based Image Processing & Conversion**

ImageWrangler is a **frontend-only, privacy-preserving** image suite that resizes, crops, compresses, and converts images **entirely in your browser**. No servers. No uploads. No tracking. Built for designers, developers, photographers, and privacy-conscious users.

> 🔒 **Your images never leave your machine.** All processing runs in browser memory via client-side Web Workers and HTML5 Canvas APIs.

---

## 🌐 Live Demo

🔗 [https://imagewrangler.pages.dev/](https://imagewrangler.pages.dev/)

---

## 🚀 Key Features

### 🛡️ Privacy by Design
- **100% Client-Side**: No backend, no API keys, no server uploads.
- **Zero Tracking**: No telemetry, no third-party cookies, no analytics scripts.
- **In-Memory Operations**: Processed in volatile memory, cleared upon tab closure or one-click reset.

### 🖼️ Advanced Image Processing
- **Format Conversion**: Convert across **JPEG**, **PNG**, **WebP**, **AVIF**, and **BMP**.
- **AVIF Next-Gen Format**: Full ISOBMFF header validation, lossy compression tuning, target file size search, and browser encoding capability detection.
- **Smart Resize**: Pixel-perfect custom dimensions and aspect-ratio lock.
- **Interactive Crop Tool**: 8-handle crop container with aspect presets (1:1, 16:9, 4:3, etc.) and keyboard controls (`Esc` to dismiss).
- **Dual Compression Engines**:
  - Direct Quality Slider (1–100%) for lossy formats (JPEG, WebP, AVIF).
  - Target File Size mode (KB/MB) utilizing binary-search canvas compression.
- **Batch Validation in a Worker**: Files are validated (magic bytes, spoofing, decompression-bomb limits) and decoded one at a time inside the Web Worker, so a single bad file never blocks the rest of a batch.

### 🌍 Multi-Language Internationalization (i18n)
- **8 Supported Languages**:
  - 🇺🇸 English (`en`)
  - 🇪🇸 Spanish (`es`)
  - 🇫🇷 French (`fr`)
  - 🇩🇪 German (`de`)
  - 🇮🇳 Hindi (`hi`)
  - 🇯🇵 Japanese (`ja`)
  - 🇨🇳 Chinese (`zh`)
  - 🇧🇷 Portuguese (`pt`)
- **Instant Switching**: Seamless runtime switching without page reload.
- **Persistent Preferences**: Stores language choice in `localStorage`.
- **Zero Bloat**: Lightweight, deep-module architecture without heavy external i18n runtimes.

### 📦 Batch & Flexible Exporting
- **Multi-File Selection**: Checkbox selection for selective or bulk operations.
- **Single or Batch Downloads**: Save individual assets or bundle entire collections into a clean ZIP archive.
- **Merge All**: Combine multiple images into a unified grid collage.
- **Live Previews**: Instant before-and-after visual inspection with detailed dimension and size metrics.

### ⚡ Responsive & Accessible UI
- Warm editorial design system (cream canvas, coral accents, serif display headings).
- Designed with Tailwind CSS following clean design system tokens.
- Fully responsive across desktop, tablet, and mobile with 44px+ touch targets.
- Keyboard accessible modals (`Escape` to close) and visible focus rings.

---

## 🛠️ Supported Formats

| Format | Input | Output | Compression Mode |
| ------ | :---: | :----: | ---------------- |
| **JPEG** | ✅ | ✅ | Quality (1–100) / Target Size |
| **PNG**  | ✅ | ✅ | Lossless |
| **WebP** | ✅ | ✅ | Quality (1–100) / Target Size |
| **AVIF** | ✅ | ✅ | Quality (1–100) / Target Size *(browser canvas supported)* |
| **BMP**  | ✅ | ✅ | Lossless |

---

## 🏗️ Architecture

```
┌─────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│   User Image    │ ───▶  │ Dedicated Web Worker │ ───▶  │  Offscreen / Canvas  │
│  (Local Disk)   │       │   (ImageProcessor)   │       │   (Client Pipeline)  │
└─────────────────┘       └──────────────────────┘       └──────────────────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │ Reactive UI & State  │
                          │ (i18n, Preview, ZIP) │
                          └──────────────────────┘
```

---

## 💻 Tech Stack

- **Framework**: [Astro](https://astro.build/) (Static Site Generation)
- **UI Library**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Compression & Archive**: [JSZip](https://stuk.github.io/jszip/)
- **Fonts**: Self-hosted [Inter](https://rsms.me/inter/) + [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) via Fontsource — no external font requests
- **Icons**: Inline SVG set (`src/components/icons.tsx`) from [Coolicons](https://coolicons.cool/), [Tabler Icons](https://tabler.io/icons), and [Remix Icon](https://remixicon.com/)

---

## 📁 Project Structure

```
imagewrangler/
├── public/                 # Static assets (favicon, robots.txt, sitemap, badges)
├── src/
│   ├── components/         # React UI Components
│   │   ├── CropTool.tsx    # Interactive canvas crop editor
│   │   ├── FAQ.tsx         # Multilingual FAQ section
│   │   ├── FloatingActionButton.tsx # Quick-action menu (select/download/ZIP/merge/clear)
│   │   ├── Header.tsx      # App header with i18n language picker
│   │   ├── ImageCard.tsx   # Per-image editing card & preview modal
│   │   ├── ImageDropzone.tsx # Drag & drop upload target with validation
│   │   ├── ImageWrangler.tsx # Core state orchestrator & action bar
│   │   └── icons.tsx       # Bundled inline SVG icon set
│   ├── layouts/
│   │   └── Layout.astro    # Base HTML document, SEO meta & fonts
│   ├── lib/
│   │   ├── bmpEncoder.ts   # BMP writer (canvas has no native BMP export)
│   │   ├── fileValidation.ts # Magic byte format detection (inc. AVIF)
│   │   ├── i18n.ts         # 8-language dictionary and reactive hook
│   │   ├── imageProcessor.ts # Canvas transformations & compression
│   │   ├── types.ts        # Shared TypeScript interfaces
│   │   ├── utils.ts        # Small helpers (cn, formatBytes, generateId)
│   │   └── workerManager.ts # Web worker abstraction pool
│   ├── pages/
│   │   └── index.astro     # Root application page
│   ├── styles/
│   │   └── global.css      # Design tokens and utility layers
│   └── workers/
│       └── imageProcessor.worker.ts # Off-thread image computation
├── astro.config.mjs        # Astro configuration
├── tailwind.config.ts      # Tailwind design system tokens
└── tsconfig.json           # Strict TypeScript configuration
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Installation

```bash
git clone https://github.com/Ashutoshgit47/ImageWrangler.git
cd ImageWrangler
npm install
```

### Development Server

```bash
npm run dev
```
Open `http://localhost:4321` to view the app locally.

### Production Build

```bash
npm run build
```
Generates an optimized static output in `dist/`, ready for Cloudflare Pages, Vercel, or GitHub Pages.

### Quality Checks

```bash
npm run check      # Astro + TypeScript diagnostics
npm run typecheck  # Strict TypeScript check
```

---

## 👨‍💻 About the Developer

**Ashutosh Gautam**
- **GitHub**: [https://github.com/Ashutoshgit47](https://github.com/Ashutoshgit47)
- **Portfolio / Website**: [https://ashutosh47.pages.dev/](https://ashutosh47.pages.dev/)

Feel free to open an issue or pull request if you have ideas or suggestions!

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

> ⭐ If you find ImageWrangler useful, please star the repository!

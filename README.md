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
- **Smart Resize**: Pixel-perfect custom dimensions, aspect-ratio lock, and preset shortcuts.
- **Interactive Crop Tool**: 8-handle crop container with aspect presets (1:1, 16:9, 4:3, etc.) and keyboard controls (`Esc` to dismiss).
- **Dual Compression Engines**:
  - Direct Quality Slider (1–100%) for lossy formats (JPEG, WebP, AVIF).
  - Target File Size mode (KB/MB) utilizing binary-search canvas compression.

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
- Designed with Tailwind CSS following clean design system tokens.
- Fully responsive across desktop, tablet, and mobile with 44px+ touch targets.
- Keyboard accessible modal navigation (`Escape` listener) and focus traps.

---

## 🛠️ Supported Formats

| Format | Input | Output | Compression Mode |
| ------ | :---: | :----: | ---------------- |
| **JPEG** | ✅ | ✅ | Quality (1–100) / Target Size |
| **PNG**  | ✅ | ✅ | Lossless |
| **WebP** | ✅ | ✅ | Quality (1–100) / Target Size |
| **AVIF** | ✅ | ✅ | Quality (1–100) / Target Size *(browser canvas supported)* |
| **BMP**  | ✅ | ✅ | Lossless |
| **GIF**  | ✅ | ❌ | First frame extraction |

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
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📁 Project Structure

```
imagewrangler/
├── public/                 # Static assets (favicons, robots.txt, manifest)
├── src/
│   ├── components/         # React UI Components
│   │   ├── AboutDev.tsx    # Developer profile and portfolio links
│   │   ├── CropTool.tsx    # Interactive canvas crop editor
│   │   ├── FAQ.tsx         # Multilingual FAQ section
│   │   ├── Header.tsx      # App header with i18n language picker
│   │   ├── ImageCard.tsx   # Per-image editing card & preview modal
│   │   ├── ImageDropzone.tsx # Drag & drop upload target with validation
│   │   └── ImageWrangler.tsx # Core state orchestrator & action bar
│   ├── layouts/
│   │   └── Layout.astro    # Base HTML document, SEO meta & fonts
│   ├── lib/
│   │   ├── fileValidation.ts # Magic byte format detection (inc. AVIF)
│   │   ├── i18n.ts         # 8-language dictionary and reactive hook
│   │   ├── imageProcessor.ts # Canvas transformations & compression
│   │   ├── types.ts        # Shared TypeScript interfaces
│   │   └── workerManager.ts # Web worker abstraction pool
│   ├── pages/
│   │   └── index.astro     # Root application page
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

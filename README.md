# ImageWrangler 🖼️

**Privacy-First, Browser-Based Image Processing**

ImageWrangler is a **frontend-only, privacy-preserving** image tool that resizes, crops, compresses, and converts images **entirely in your browser**. No servers. No uploads. No data leaks. Built for designers, developers, and privacy-conscious users.

> 🔒 **Your images never leave your machine.** All processing happens in browser memory using Web Workers.

---

## 🚀 Live Demo

🌐 https://imagewrangler.pages.dev/

---

## ✨ Key Features

### 🔐 Privacy by Design

- 100% client-side processing (no backend)
- Files are never uploaded or stored
- Session-only memory (one-click clear)
- No tracking, no cookies, no analytics

### 🖼️ Powerful Image Processing

- **Resize**: Set custom width/height, lock aspect ratio
- **Crop**: Interactive 8-handle crop tool with presets (1:1, 16:9, 4:3, etc.)
- **Compress**: Quality slider for JPEG/WebP, Target File Size mode
- **Format Convert**: JPEG, PNG, WebP, BMP supported

### 📥 Flexible Download Options

- **Select Images**: Checkbox to select single or multiple images
- **Download Individual**: Download selected or all images as separate files
- **Download as ZIP**: Bundle selected or all images into a single ZIP
- **Merge All**: Combine multiple images into a single grid

### 📦 Batch Processing

- Process multiple images at once
- Download all or selected as a single ZIP file
- Live preview of before/after

### 🎨 Modern UI

- Dark theme optimized for long sessions
- Responsive (desktop, tablet, mobile)
- Smooth animations and micro-interactions

---

## 🧠 How ImageWrangler Works

```
┌──────────────┐   ┌──────────────┐   ┌───────────────┐
│  Image File  │→  │  Web Worker  │→  │ Canvas API    │
│ (Your Disk)  │   │ (Offscreen)  │   │ (Processing)  │
└──────────────┘   └──────────────┘   └───────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │  UI & Export │
                      │ (Preview/ZIP)│
                      └──────────────┘
```

---

## 🎯 Use Cases

- 📸 Quick batch resizing for social media
- 🎨 Preparing images for web/app development
- 📦 Compressing photos for email attachments
- 🔐 Processing sensitive images offline
- 🖼️ Creating image collages with Merge

---

## 🖼️ Supported Formats

| Format | Input | Output | Compression |
| ------ | ----- | ------ | ----------- |
| JPEG   | ✅    | ✅     | Quality 1-100 |
| PNG    | ✅    | ✅     | Lossless |
| WebP   | ✅    | ✅     | Quality 1-100 |
| BMP    | ✅    | ✅     | Lossless |
| GIF    | ✅    | ❌     | — |

---

## ⚠️ Limitations

- **Max file size:** ~100 MB (browser memory dependent)
- **Max dimensions:** 15,000 × 15,000 px
- GIF animation is not preserved (first frame only)
- Very large files may slow down older devices

---

## 🛠️ Tech Stack

- **Astro + React + TypeScript**
- **Tailwind CSS** for styling
- **Web Workers** for non-blocking processing
- **JSZip** for batch downloads
- **Zero backend / zero database**

---

## 🚀 Getting Started

### Development

```bash
git clone https://github.com/Ashutoshgit47/ImageWrangler.git
cd ImageWrangler
npm install
npm run dev
```

### Production Build

```bash
npm run build
# Deploy the dist/ folder to any static host
```

---

## 📂 Project Structure

```
ImageWrangler/
├── src/
│   ├── components/       # React Components
│   ├── layouts/          # Astro Layouts
│   ├── lib/              # Utilities (processor, worker)
│   ├── pages/            # Astro Pages
│   ├── styles/           # Global CSS
│   └── workers/          # Web Workers
├── public/               # Static assets
├── astro.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## 🤝 Contributing

Contributions are welcome!

- Fork the repo
- Create a feature branch
- Submit a pull request

---

## 👨‍💻 Author

**Ashutosh Gautam**\
GitHub: [https://github.com/Ashutoshgit47](https://github.com/Ashutoshgit47)

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

> ⭐ If you find ImageWrangler useful, consider giving the project a star!

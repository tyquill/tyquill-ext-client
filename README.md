# Tyquill Extension

Chrome Extension with React + TypeScript + Webpack + Manifest V3 (Side Panel)

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm run dev
```

## Build

```bash
pnpm run build
```

## Load Extension

1. Build the extension using `pnpm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder
5. The extension will be loaded as a side panel

## Structure

```
tyquill-ext-client/
├── package.json
├── tsconfig.json
├── webpack/
│   ├── webpack.common.js
│   ├── webpack.dev.js
│   └── webpack.prod.js
├── src/
│   ├── manifest.json
│   ├── background/
│   │   └── index.ts
│   ├── content/
│   │   └── contentScript.ts
│   └── sidepanel/
│       ├── index.html
│       ├── index.tsx
│       └── App.tsx
└── dist/ (generated)
``` 
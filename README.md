# Tyquill Extension

Chrome Extension with React + TypeScript + WXT Framework + Zustand + Manifest V3 (Side Panel)

## Technologies

- **Framework**: WXT (Web Extension Tools)
- **Frontend**: React + TypeScript
- **State Management**: Zustand
- **Styling**: CSS Modules
- **Browser API**: WXT Browser API

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm run dev
```

This will start the development server with hot reload for the extension.

## Build

```bash
# Development build
pnpm run build:dev

# Production build
pnpm run build

# Watch mode for development
pnpm run dev
```

The built extension will be available in the `.output/` directory.

## Environment Configuration

The extension automatically detects the environment:

- **Development**: Uses `http://localhost:3000`
- **Production**: Uses `https://yvpd29knkq.ap-northeast-1.awsapprunner.com` 도메인 설정 아직안된거

To change URLs, edit `src/config/environment.ts`.

## Load Extension

1. Build the extension using `pnpm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `.output/chrome-mv3` folder
5. The extension will be loaded as a side panel

## Structure

```
tyquill-ext-client/
├── package.json
├── tsconfig.json
├── wxt.config.ts
├── entrypoints/
│   ├── background.ts
│   ├── content.tsx
│   ├── options/
│   │   ├── index.html
│   │   └── main.tsx
│   └── sidepanel/
│       ├── index.html
│       └── main.tsx
├── src/
│   ├── auth/
│   ├── background/
│   ├── components/
│   ├── config/
│   ├── content/
│   ├── hooks/
│   ├── services/
│   ├── sidepanel/
│   ├── stores/
│   ├── types/
│   └── utils/
└── .output/ (generated)
    └── chrome-mv3/
```

## Features

- **Side Panel Interface**: Main extension UI in Chrome's side panel
- **Content Script**: Floating button and page interaction
- **Background Service**: Extension lifecycle management
- **Options Page**: Extension settings and configuration
- **State Management**: Centralized state with Zustand
- **Authentication**: OAuth integration
- **Article Management**: Create, edit, and export articles 
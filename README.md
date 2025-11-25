# Expiration Reminder - Capacitor App

A cross-platform mobile application built with Capacitor.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- For Android development: Android Studio
- For iOS development: Xcode (macOS only)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the web app:
```bash
npm run build
```

3. Add platforms:
```bash
# For Android
npx cap add android

# For iOS (macOS only)
npx cap add ios
```

4. Sync Capacitor:
```bash
npm run sync
```

## Development

### Web Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Mobile Development

1. Build the web app:
```bash
npm run build
```

2. Sync with native platforms:
```bash
npm run sync
```

3. Open in native IDE:
```bash
# Android
npm run open:android

# iOS
npm run open:ios
```

## Project Structure

```
.
├── src/
│   ├── main.ts          # Main TypeScript entry point
│   └── styles.css       # Global styles
├── index.html           # HTML entry point
├── capacitor.config.ts  # Capacitor configuration
├── vite.config.ts       # Vite build configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Capacitor Plugins

This skeleton includes the following Capacitor plugins:

- **@capacitor/app** - App lifecycle and state management
- **@capacitor/haptics** - Haptic feedback
- **@capacitor/keyboard** - Keyboard events
- **@capacitor/status-bar** - Status bar styling

## Building for Production

1. Build the web app:
```bash
npm run build
```

2. Sync with native platforms:
```bash
npm run sync
```

3. Open in native IDE and build:
```bash
npm run open:android  # or npm run open:ios
```

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)


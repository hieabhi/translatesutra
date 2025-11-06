# Electron App - TranslateSutra

This directory contains the Electron desktop application for TranslateSutra.

## Features

- **Floating Button**: Always-on-top draggable floating button for quick access
- **Global Hotkeys**: `Ctrl+Shift+T` (Windows/Linux) or `Cmd+Shift+T` (macOS) for instant translation
- **Clipboard Integration**: Automatically reads clipboard content for translation
- **Translation Results**: Beautiful floating window displaying translation results
- **Multi-service Support**: Backend API with LibreTranslate fallback
- **Secure Authentication**: Token storage using OS keychain (keytar)

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Install dependencies
npm install

# Development mode (with hot reload)
npm run dev-watch

# Build TypeScript
npm run build

# Run without rebuild
npm run start
```

### Building for Production

```bash
# Build for current platform
npm run dist

# Build for specific platforms
npm run build:win     # Windows
npm run build:mac     # macOS  
npm run build:linux   # Linux

# Package without installer
npm run pack
```

## Project Structure

```
src/
├── main.ts              # Electron main process
├── preload.ts           # Preload script for security
├── utils/
│   └── api.ts          # API calls and authentication
└── renderer/
    ├── floatButton.html # Floating button UI
    ├── floatButton.ts   # Floating button logic
    ├── result.html      # Translation result UI
    └── result.ts        # Translation result logic
```

## Configuration

The app uses environment variables and electron-store for configuration:

### Environment Variables
- `BACKEND_URL` - Backend API URL (default: http://localhost:3000)
- `LIBRETRANSLATE_URL` - LibreTranslate URL (default: http://localhost:5000)
- `NODE_ENV` - Environment mode (development/production)

### App Settings (stored via electron-store)
- `windowPosition` - Floating button position
- `autoStart` - Start with system
- `hotkey` - Global hotkey combination
- `targetLanguage` - Default target language
- `sourceLanguage` - Default source language
- `showNotifications` - Show translation notifications
- `keepTranslationHistory` - Save translation history

## Security

- **Context Isolation**: Renderer processes are isolated from Node.js
- **Preload Script**: Safe API exposure to renderer processes
- **No Node Integration**: Renderer processes cannot access Node.js directly
- **Secure Token Storage**: Authentication tokens stored in OS keychain

## Authentication

The app supports user authentication with the backend:

1. **Login Flow**: Click floating button → Login modal → Store tokens securely
2. **Token Management**: Automatic token refresh and secure storage
3. **Fallback Mode**: Works without authentication using LibreTranslate

## Translation Flow

1. User presses global hotkey (`Ctrl+Shift+T`)
2. App reads clipboard content
3. If authenticated, calls backend API; otherwise uses LibreTranslate
4. Displays result in floating window near cursor
5. User can copy, pin, or close the result

## Packaging & Distribution

### Code Signing (Production)

For production releases, you'll need code signing certificates:

**Windows:**
```bash
# Set environment variables
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate_password"
npm run build:win
```

**macOS:**
```bash
# Set environment variables  
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate_password"
export APPLE_ID="your@apple.id"
export APPLE_ID_PASSWORD="app_specific_password"
npm run build:mac
```

### Auto-updater

The app is configured for auto-updates using electron-updater. To enable:

1. Set up a release server (GitHub Releases, S3, etc.)
2. Configure update server URL in main.ts
3. Implement update checking logic
4. Handle update download and installation

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Smoke test - just verify app starts
npm run start
```

## Debugging

### Main Process
- Use `--inspect` flag: `electron --inspect=5858 .`
- Attach debugger to port 5858

### Renderer Process
- Open DevTools: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS)
- Or programmatically: `webContents.openDevTools()`

### Logs
- Main process logs: Console output
- Renderer process logs: DevTools console
- System logs: Check OS-specific locations

## Common Issues

### Windows
- **Missing DLLs**: Install Visual C++ Redistributable
- **Antivirus**: Whitelist the app or sign with EV certificate
- **Permissions**: Run as administrator if needed

### macOS
- **Gatekeeper**: Sign with Apple Developer certificate
- **Notarization**: Required for macOS 10.15+
- **Accessibility**: Grant accessibility permissions for global hotkeys

### Linux
- **AppImage execution**: Make executable with `chmod +x`
- **Desktop integration**: Install with package manager when available
- **Wayland**: Some features may not work on Wayland (use X11)

## Next Steps

1. **Code Signing**: Obtain certificates for production
2. **Auto-updater**: Implement update mechanism
3. **Telemetry**: Add usage analytics (optional)
4. **Themes**: Support for light/dark themes
5. **Languages**: Additional UI languages
6. **Plugins**: Extension system for custom translation services
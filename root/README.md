# TranslateSutra 🌐

A floating desktop translator app with one-click download and authentication. Translate text instantly with a global hotkey, featuring a beautiful floating UI and seamless user experience.

## Features

- 🚀 **Global Hotkey Translation** - Press `Ctrl+Shift+T` (or `Cmd+Shift+T` on macOS) to translate selected text or clipboard content
- 🎯 **Always-on-top Floating Button** - Draggable floating button for quick access
- 🔐 **User Authentication** - Secure login/register system with JWT tokens
- 🖥️ **Cross-Platform** - Windows, macOS, and Linux support
- 🔄 **Multiple Translation Backends** - Supports LibreTranslate (self-hosted) and external APIs
- 📦 **One-Click Installers** - Automatic OS detection and download links
- 🐳 **Docker Support** - Easy deployment with Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- PostgreSQL (via Docker or local installation)

### Local Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd TranslateSutra
   npm run setup
   ```

2. **Configure Environment**
   ```bash
   copy .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Services**
   ```bash
   # Start PostgreSQL and optional services
   npm run docker:up
   
   # Start backend (in separate terminal)
   npm run dev:backend
   
   # Start Electron app (in separate terminal)
   npm run dev:electron
   ```

4. **Test the App**
   - Copy any text to clipboard
   - Press `Ctrl+Shift+T` (Windows/Linux) or `Cmd+Shift+T` (macOS)
   - Translation popup should appear

### Building for Production

```bash
# Build all components
npm run build:all

# Package Electron app
cd app-electron
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Architecture

### Backend (`/backend`)
- **Node.js/Express** with TypeScript
- **PostgreSQL** database with migrations
- **JWT Authentication** with refresh tokens
- **Device Registration** for app licensing
- **Argon2** password hashing

### Desktop App (`/app-electron`)
- **Electron** with TypeScript
- **Global Hotkeys** for instant translation
- **Floating Windows** with drag support
- **Clipboard Integration**
- **Secure Token Storage** via OS keychain

### Web Landing (`/web-landing`)
- **Static Website** with OS detection
- **Download Links** for installers
- **Login/Register** web interface

### Infrastructure (`/infra`)
- **Docker Compose** stack
- **LibreTranslate** for self-hosted translation
- **Keycloak** integration (optional)
- **Nginx** configuration examples

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user info

### Device Management
- `POST /device/register` - Register a device

### Translation
- `POST /translate` - Translate text (protected)

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/translatesutra

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Translation Services
LIBRETRANSLATE_URL=http://localhost:5000
LIBRETRANSLATE_API_KEY=optional-api-key

# Backend
PORT=3000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:3001
```

## Testing

```bash
# Run all tests
npm run test:all

# Backend tests only
cd backend && npm test

# Electron smoke tests
cd app-electron && npm test
```

## Security & Privacy

⚠️ **Privacy Warning**: By default, translations may be sent to external APIs. For complete privacy:

1. **Self-host LibreTranslate**:
   ```bash
   # Uncomment libretranslate service in docker-compose.yml
   docker compose up -d libretranslate
   ```

2. **Update configuration**:
   ```env
   LIBRETRANSLATE_URL=http://localhost:5000
   ```

### Security Features
- ✅ Argon2 password hashing
- ✅ JWT tokens with secure refresh
- ✅ HTTPS enforcement (production)
- ✅ Secure token storage (OS keychain)
- ✅ Input validation and sanitization

## Development Checklist

- [ ] Set up local environment
- [ ] Configure `.env` file
- [ ] Start PostgreSQL database
- [ ] Run backend tests
- [ ] Test Electron app startup
- [ ] Verify global hotkey functionality
- [ ] Test translation workflow
- [ ] Check authentication flow
- [ ] Validate web landing page

## Next Steps (Production)

### Code Signing & Distribution
- [ ] Obtain code signing certificates
  - Windows: Extended Validation (EV) certificate
  - macOS: Apple Developer certificate
  - Linux: GPG signing (optional)

### CI/CD Pipeline
- [ ] Set up GitHub Actions for automated builds
- [ ] Configure artifact storage (AWS S3/Cloudflare R2)
- [ ] Implement auto-updater system
- [ ] Create release manifest system

### Infrastructure
- [ ] Set up production PostgreSQL
- [ ] Deploy LibreTranslate cluster
- [ ] Configure CDN for installer distribution
- [ ] Set up monitoring and logging

### Performance & Scaling
- [ ] Load test LibreTranslate deployment
- [ ] Implement translation caching
- [ ] Add telemetry and analytics
- [ ] Optimize Electron bundle size

### Security Hardening
- [ ] Security audit of authentication system
- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Set up security headers

## Technology Stack

- **Backend**: Node.js, Express, TypeScript, PostgreSQL
- **Desktop**: Electron, TypeScript
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Database**: PostgreSQL with node-postgres
- **Authentication**: JWT with refresh tokens
- **Password Hashing**: Argon2
- **Translation**: LibreTranslate (self-hosted) or external APIs
- **Infrastructure**: Docker, Docker Compose, Nginx

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- 📝 Create an issue on GitHub
- 📧 Email: support@translatesutra.com
- 💬 Discord: [Community Server](https://discord.gg/translatesutra)

---

**Note**: This is an MVP/starter repository. Production deployment requires additional security hardening, proper code signing, and infrastructure setup as outlined in the "Next Steps" section.
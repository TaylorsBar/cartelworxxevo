This software is **Proprietary and Confidential**. All rights reserved by Karapiro Cartel - State Highway Speed Shop.

**Copyright © 2025 Karapiro Cartel - State Highway Speed Shop. All Rights Reserved.**

This software and its source code, including but not limited to algorithms, workflows, database schemas, user interface designs, AI/ML models, and all proprietary methods, are protected intellectual property. 

Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited without explicit written permission from the copyright holder.

For licensing inquiries or permission requests, see the [LICENSE](LICENSE) file or contact us through our [GitHub repository](https://github.com/TaylorsBar/cartelworxxevo).<div align="center">

![Karapiro Cartel](https://github.com/user-attachments/assets/4c21c50d-6301-4f22-bd71-c854f2f59b5f)

# CartelWorxxEvo

### 🏎️ State Highway Speed Shop - Advanced Automotive Diagnostics Platform

[![License: MIT](https://img.shields.io/badge/License-Proprietary-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-96.7%25-blue.svg)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Powered-orange.svg)](https://firebase.google.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Cross--Platform-brightgreen.svg)](https://capacitorjs.com/)

</div>

---

## 📋 Overview

CartelWorxxEvo is a cutting-edge cross-platform automotive diagnostics and AI-powered assistance application built for the Karapiro Cartel State Highway Speed Shop. This modern platform combines real-time vehicle diagnostics, AI conversational intelligence, and 3D visualization to revolutionize automotive service and repair workflows.

## ✨ Key Features

### 🔌 **Bluetooth LE Integration**
- Real-time OBD-II diagnostic data streaming
- Live vehicle sensor monitoring
- Fault code reading and analysis
- Multi-device connection support

### 🤖 **AI-Powered Assistance**
- Google Gemini AI integration for intelligent diagnostics
- Natural language conversational interface
- Context-aware troubleshooting recommendations
- Real-time diagnostic interpretation

### 📊 **Advanced Analytics**
- Live data visualization with Recharts
- Historical performance tracking
- Predictive maintenance insights
- Custom reporting dashboards

### 🎨 **Modern 3D Interface**
- Three.js powered 3D vehicle visualizations
- Interactive component exploration
- Real-time rendering of diagnostic data
- Immersive user experience

### 🌐 **Cross-Platform Support**
- **Desktop**: Electron-based native application
- **iOS**: Native iOS app via Capacitor
- **Android**: Native Android app via Capacitor
- **Web**: Progressive Web App (PWA)

### 📍 **Geolocation Services**
- Location-based service recommendations
- Nearby shop finder
- Route optimization for mobile diagnostics

### 🔐 **Enterprise Features**
- Firebase backend integration
- Sentry error tracking and monitoring
- Secure data synchronization
- User authentication and authorization

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **React Router DOM** - Client-side routing
- **Zustand** - State management
- **Three.js** & **@react-three/fiber** - 3D graphics
- **@react-three/drei** - 3D helpers and components
- **Recharts** - Data visualization
- **React Markdown** - Markdown rendering

### Mobile & Desktop
- **Capacitor 7.4.4** - Cross-platform runtime
- **Electron** - Desktop application framework
- **@capacitor-community/bluetooth-le** - Bluetooth connectivity
- **@capacitor/geolocation** - Location services

### Backend & Services
- **Firebase 12.5.0** - Backend as a Service
- **Google Generative AI** - AI/ML capabilities
- **@hashgraph/sdk** - Distributed ledger integration
- **Sentry** - Error tracking and monitoring

### Development Tools
- **Jest** - Unit testing framework
- **@testing-library/react** - Component testing
- **Electron Builder** - Desktop app packaging

## 🚀 Getting Started

### Prerequisites

- **Node.js** v16+ (v18+ recommended)
- **npm** or **yarn**
- **Git**
- For iOS development: Xcode
- For Android development: Android Studio
- For desktop: Electron runtime

### Installation

```bash
# Clone the repository
git clone https://github.com/TaylorsBar/cartelworxxevo.git

# Navigate to project directory
cd cartelworxxevo

# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google Gemini AI
VITE_GEMINI_API_KEY=your_gemini_api_key

# Sentry (Optional)
VITE_SENTRY_DSN=your_sentry_dsn
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Build with production environment
npm run build:production

# Preview production build
npm run preview

# Run tests
npm test
```

### Platform-Specific Builds

#### Desktop (Electron)
```bash
# Start Electron app
npm run electron:start

# Build Electron app
npm run electron:build
```

#### Mobile (iOS/Android)
```bash
# Sync with Capacitor
npx cap sync

# Open in Xcode (iOS)
npx cap open ios

# Open in Android Studio (Android)
npx cap open android
```

## 📱 Platform Compatibility

| Platform | Status | Notes |
|----------|--------|-------|
| 🌐 Web | ✅ Supported | PWA with offline capabilities |
| 🖥️ Desktop (Windows) | ✅ Supported | Electron-based |
| 🖥️ Desktop (macOS) | ✅ Supported | Electron-based |
| 🖥️ Desktop (Linux) | ✅ Supported | Electron-based |
| 📱 iOS | ✅ Supported | Requires iOS 13+ |
| 📱 Android | ✅ Supported | Requires Android 7.0+ |

## 🏗️ Project Structure

```
cartelworxxevo/
├── .github/workflows/    # CI/CD workflows
├── .idx/                 # IDX configuration
├── android/              # Android native code
├── components/           # React components
├── contexts/             # React contexts
├── electron/             # Electron main process
├── functions/            # Firebase Cloud Functions
├── hooks/                # Custom React hooks
├── ios/                  # iOS native code
├── pages/                # Application pages
├── public/               # Static assets
├── services/             # API and service integrations
├── src/                  # Source code
├── store/                # State management
├── utils/                # Utility functions
├── App.tsx               # Main application component
├── Sidebar.tsx           # Navigation sidebar
├── CoPilot.tsx           # AI assistant component
├── electron.cjs          # Electron entry point
├── capacitor.config.ts   # Capacitor configuration
├── vite.config.ts        # Vite configuration
└── package.json          # Project dependencies
```

## 🤝 Contributing

We welcome contributions from the community! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain test coverage for new features
- Update documentation for significant changes
- Follow the existing code style and conventions
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Karapiro Cartel - State Highway Speed Shop

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 📞 Support & Contact

### Karapiro Cartel - State Highway Speed Shop

- **GitHub**: [TaylorsBar/cartelworxxevo](https://github.com/TaylorsBar/cartelworxxevo)
- **Issues**: [Report a Bug](https://github.com/TaylorsBar/cartelworxxevo/issues)
- **Discussions**: [Community Forum](https://github.com/TaylorsBar/cartelworxxevo/discussions)

## 🙏 Acknowledgments

- Google Gemini AI for intelligent diagnostics
- Firebase for backend infrastructure
- Capacitor for cross-platform capabilities
- The open-source community for amazing tools and libraries

---

<div align="center">

![Karapiro Cartel Logo](https://github.com/user-attachments/assets/2a7a0849-e2f7-4f3c-9851-dbb90ca7b6d9)

**Built with ❤️ by Karapiro Cartel**

*State Highway Speed Shop - Where Performance Meets Innovation*

</div>

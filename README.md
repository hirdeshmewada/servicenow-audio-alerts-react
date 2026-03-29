# ServiceNow Audio Alerts - React Edition

A professional Chrome extension for monitoring ServiceNow queues with real-time audio alerts, now rebuilt with modern React.js for enhanced user experience and maintainability.

## 🚀 Features

- **Real-time Queue Monitoring**: Monitor multiple ServiceNow queues simultaneously
- **Audio Notifications**: Customizable audio alerts with volume and duration controls
- **Modern React Interface**: Clean, responsive UI built with React.js
- **Dashboard Analytics**: Real-time statistics and queue analytics
- **Flexible Configuration**: Easy queue management with custom notification settings
- **Chrome Extension Integration**: Seamless browser integration with popup and options pages
- **Background Service**: Efficient background polling with alarm management
- **Content Script Integration**: Enhanced ServiceNow page integration

## 📋 Prerequisites

- Node.js 14+ 
- npm or yarn
- Google Chrome browser
- ServiceNow instance access

## 🛠️ Installation

### Development Setup

1. **Clone and install dependencies**:
```bash
cd "c:\Users\hirde\OneDrive\Desktop\company projecy\servicenow-audio-alerts-react"
npm install
```

2. **Start development server**:
```bash
npm start
```

3. **Build for Chrome extension**:
```bash
npm run build:extension
```

4. **Load in Chrome**:
   - Open `chrome://extensions`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the `dist` folder

### Production Build

```bash
# Build and create ZIP package
npm run build:zip

# The extension ZIP will be in dist/servicenow-audio-alerts-react.zip
```

## 🏗️ Project Structure

```
servicenow-audio-alerts-react/
├── 📄 public/                    # Static assets
│   ├── manifest.json           # Chrome extension manifest
│   ├── options.html            # Main React app entry
│   ├── popup.html              # Extension popup
│   ├── sound/                  # Audio files
│   └── icons/                  # Extension icons
├── 📄 src/
│   ├── 🎯 components/           # React components
│   │   ├── Dashboard/          # Dashboard components
│   │   ├── Configuration/      # Queue management
│   │   ├── Settings/           # Settings panels
│   │   ├── Shared/             # Common components
│   │   └── Popup/              # Extension popup
│   ├── 🎣 hooks/               # React hooks
│   │   ├── useChromeStorage.js # Chrome storage API
│   │   ├── useServiceNowAPI.js # ServiceNow integration
│   │   └── useNotifications.js # Notification system
│   ├── 🔧 services/            # Core services
│   │   ├── stateManager.js     # State management
│   │   ├── servicenowAPI.js    # API integration
│   │   ├── audioManager.js     # Audio handling
│   │   └── notificationSystem.js # Notifications
│   ├── 🌐 background/          # Background scripts
│   ├── 📄 content/             # Content scripts
│   ├── 🎨 styles/              # CSS styles
│   ├── App.jsx               # Main React app
│   └── index.js              # Entry point
├── 📄 webpack.config.js        # Build configuration
├── 📄 package.json             # Dependencies
└── 📄 README.md               # Documentation
```

## ⚙️ Configuration

### ServiceNow Setup

1. **Base URL**: Your ServiceNow instance URL (e.g., `https://instance.service-now.com`)
2. **Queue URLs**: Filtered list URLs from ServiceNow
3. **Notification Text**: Custom messages for each queue

### Audio Settings

- **Volume**: 0-100% control
- **Playback Duration**: 1-60 seconds
- **Loop Option**: Continuous playback until stopped
- **Custom Audio**: Upload custom sound files

### Monitoring Controls

- **Poll Interval**: 1-60 minutes
- **Alert Conditions**: Count > 0 or New ticket appears
- **Quiet Hours**: Suppress notifications during specified times

## 🔧 Development

### Key Components

- **App.jsx**: Main application with routing
- **Header.jsx**: Status indicator and start/stop controls
- **Dashboard.jsx**: Real-time monitoring overview
- **Configuration.jsx**: Queue management interface
- **Settings.jsx**: Audio and notification preferences

### React Hooks

- **useChromeStorage**: Chrome storage API abstraction
- **useServiceNowAPI**: ServiceNow API integration
- **useNotifications**: Desktop notification system

### Services

- **stateManager**: Centralized state management
- **audioManager**: Audio playback and controls
- **notificationSystem**: Chrome notifications
- **servicenowAPI**: API communication

## 🧪 Testing

### Manual Testing

1. **Load extension** in Chrome developer mode
2. **Configure queues** with ServiceNow URLs
3. **Test audio** notifications
4. **Verify background polling**
5. **Check popup functionality**

### Debugging

- **Background script**: `chrome://extensions` → Service worker → inspect
- **Popup**: Right-click popup → inspect
- **Options page**: Open options page → F12 developer tools

## 📦 Build Process

The extension uses Webpack to bundle React components and create Chrome extension files:

1. **React Components**: Compiled with Babel
2. **CSS Styles**: Processed and bundled
3. **Static Assets**: Copied to dist folder
4. **Chrome Files**: Manifest, HTML, and scripts
5. **ZIP Package**: Ready for Chrome Web Store

## 🔄 Migration from Original

This React version maintains full compatibility with the original extension while adding:

- **Modern React Architecture**: Component-based design
- **Enhanced UX**: Better loading states and error handling
- **Improved Performance**: Optimized rendering and state management
- **Better Maintainability**: Modular code structure
- **Responsive Design**: Mobile-friendly interface

## 🐛 Troubleshooting

### Common Issues

1. **Extension won't load**: Check manifest syntax and permissions
2. **Audio not playing**: Verify audio file paths and browser permissions
3. **API errors**: Check ServiceNow URLs and authentication
4. **Background script issues**: Review Chrome developer console

### Debug Steps

1. Open Chrome developer tools
2. Check extension service worker logs
3. Verify network requests to ServiceNow
4. Test audio playback in browser console
5. Review Chrome storage data

## 📄 License

This project maintains the same license as the original ServiceNow Audio Alerts extension.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- **Developer**: Hirdesh Mewada
- **Email**: hirdeshrajput143@gmail.com
- **GitHub**: hirdeshmewada/servicenow-audio-alert-chrome-extension

---

**Built with ❤️ using React.js and modern web technologies**

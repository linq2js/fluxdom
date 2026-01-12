# Stash - Requirements Document

## 1. Project Overview

**Stash** is a browser-based personal file storage application that provides users with flexible storage options for their files. The application features a Windows Explorer-like interface, enables peer-to-peer file sharing across devices using WebRTC technology, and offers three security levels to match different user needs - from simple storage to fully encrypted vaults.

### 1.1 Core Objectives

- Provide a flexible, browser-based file storage solution with user-selectable security levels
- Offer an intuitive file explorer interface similar to Windows Explorer
- Support optional file encryption with passcode protection (Security Level 3)
- Enable peer-to-peer file sharing between devices
- Maintain file encryption independent of passcode changes (when encryption is enabled)
- Work as an installable Progressive Web App for maximum data persistence

---

## 2. Functional Requirements

### 2.1 User Interface

#### 2.1.1 File Explorer Interface
- **FR-UI-001**: The application MUST provide a file explorer interface similar to Windows Explorer
- **FR-UI-002**: The interface MUST display files and folders in a hierarchical tree structure
- **FR-UI-003**: The application MUST support multiple view modes:
  - List view
  - Grid/Icon view
  - Details view (with file size, type, date modified)
- **FR-UI-004**: The UI MUST display file/folder properties including:
  - Name
  - Size
  - Type/Extension
  - Date created
  - Date modified
- **FR-UI-005**: The application MUST provide visual feedback for all user actions (loading states, progress indicators, etc.)

#### 2.1.2 Navigation
- **FR-NAV-001**: Users MUST be able to navigate through folders by double-clicking
- **FR-NAV-002**: The application MUST provide breadcrumb navigation
- **FR-NAV-003**: Users MUST be able to use back/forward navigation buttons
- **FR-NAV-004**: The application MUST support keyboard navigation (arrow keys, Enter, Backspace)

### 2.2 File Operations

#### 2.2.1 Basic File Management
- **FR-FILE-001**: Users MUST be able to upload files to the vault
- **FR-FILE-002**: Users MUST be able to download files from the vault
- **FR-FILE-003**: Users MUST be able to delete files and folders
- **FR-FILE-004**: Users MUST be able to rename files and folders
- **FR-FILE-005**: Users MUST be able to create new folders
- **FR-FILE-006**: Users MUST be able to move files/folders (drag-and-drop or cut/paste)
- **FR-FILE-007**: Users MUST be able to copy files/folders
- **FR-FILE-008**: The application MUST support batch operations (select multiple files)
- **FR-FILE-009**: Users MUST be able to preview files when possible (images, text, PDFs)

#### 2.2.2 File Selection
- **FR-SELECT-001**: Users MUST be able to select individual files/folders
- **FR-SELECT-002**: Users MUST be able to select multiple items using:
  - Ctrl+Click (individual selection)
  - Shift+Click (range selection)
  - Ctrl+A (select all)
- **FR-SELECT-003**: The application MUST provide a context menu for selected items

#### 2.2.3 Search and Filter
- **FR-SEARCH-001**: Users MUST be able to search for files by name
- **FR-SEARCH-002**: The application SHOULD support advanced search filters:
  - File type
  - Date range
  - Size range
- **FR-SEARCH-003**: Search results MUST be displayed in real-time

### 2.3 Security & Authentication

#### 2.3.1 Security Levels

The application MUST support three security levels, allowing users to choose their preferred balance between convenience and security:

##### **Level 1: Basic (No Passcode)**
- **FR-SEC-LEVEL-BASIC-001**: Users MAY choose to use the vault without a passcode
- **FR-SEC-LEVEL-BASIC-002**: Files are stored in IndexedDB without encryption
- **FR-SEC-LEVEL-BASIC-003**: No authentication required to access files
- **FR-SEC-LEVEL-BASIC-004**: Security relies entirely on device-level protection (OS user account, device encryption)
- **FR-SEC-LEVEL-BASIC-005**: The application MUST display a clear warning about security implications
- **FR-SEC-LEVEL-BASIC-006**: Warning MUST state: "Files are not encrypted and can be accessed by anyone with access to your browser storage"

**Use Case:** Personal device with strong OS-level security, convenience prioritized over encryption

**Threat Protection:**
- ✅ Casual unauthorized access (requires physical device access)
- ❌ Browser storage inspection (files readable in IndexedDB)
- ❌ Malicious browser extensions (can read files)
- ❌ Device theft (if OS encryption not enabled)

##### **Level 2: Secure App UI (Passcode-Protected Access)**
- **FR-SEC-LEVEL-UI-001**: Users set a passcode to access the application
- **FR-SEC-LEVEL-UI-002**: Files are stored in IndexedDB **without encryption**
- **FR-SEC-LEVEL-UI-003**: Passcode is required to unlock the app UI
- **FR-SEC-LEVEL-UI-004**: The application MUST lock after inactivity (configurable timeout)
- **FR-SEC-LEVEL-UI-005**: Passcode verification uses secure hashing (not stored in plaintext)
- **FR-SEC-LEVEL-UI-006**: The application MUST display warning: "Files are protected by passcode but not encrypted in storage"
- **FR-SEC-LEVEL-UI-007**: Rate limiting and lockout apply (see FR-AUTH-006, FR-AUTH-007)

**Use Case:** Prevent casual snooping, faster performance (no encryption overhead), reliance on device security

**Threat Protection:**
- ✅ Casual unauthorized access (passcode required)
- ✅ Someone borrowing your device (app is locked)
- ❌ Browser storage inspection (files readable in IndexedDB if passcode bypassed)
- ❌ Malicious browser extensions (can read unencrypted files)
- ⚠️ Device theft (passcode protects app UI, but files not encrypted at rest)

##### **Level 3: Encryption (Passcode + File Encryption)**
- **FR-SEC-LEVEL-ENC-001**: Users set a passcode to access the application
- **FR-SEC-LEVEL-ENC-002**: All files are encrypted before storage using AES-256-GCM
- **FR-SEC-LEVEL-ENC-003**: Passcode is required to unlock the app and decrypt files
- **FR-SEC-LEVEL-ENC-004**: The application MUST use the master key architecture (see section 4.3.1)
- **FR-SEC-LEVEL-ENC-005**: Changing passcode does NOT require re-encrypting all files (only master key wrapper)
- **FR-SEC-LEVEL-ENC-006**: The application MUST display: "Files are encrypted and protected by your passcode"
- **FR-SEC-LEVEL-ENC-007**: Forgotten passcode = permanent data loss (by design)

**Use Case:** Maximum security, sensitive files, untrusted device environments

**Threat Protection:**
- ✅ Casual unauthorized access (passcode + encryption)
- ✅ Browser storage inspection (files encrypted in IndexedDB)
- ✅ Malicious browser extensions (files encrypted, keys not accessible)
- ✅ Device theft (files remain encrypted without passcode)
- ⚠️ Passcode brute-force (mitigated by PBKDF2 + rate limiting)

#### 2.3.2 Security Level Selection

- **FR-SEC-SELECT-001**: Users MUST choose security level on first launch
- **FR-SEC-SELECT-002**: The application MUST clearly explain each security level with:
  - What is protected
  - What is NOT protected
  - Performance implications
  - Use case recommendations
- **FR-SEC-SELECT-003**: Users MUST be able to change security level in settings
- **FR-SEC-SELECT-004**: Changing from Basic/UI to Encryption MUST encrypt all existing files
- **FR-SEC-SELECT-005**: Changing from Encryption to Basic/UI MUST decrypt all existing files
- **FR-SEC-SELECT-006**: Security level changes MUST require user confirmation with warning
- **FR-SEC-SELECT-007**: The application SHOULD recommend Level 2 (Secure App UI) as default for balance
- **FR-SEC-SELECT-008**: The application MUST show current security level in settings/status bar

#### 2.3.3 Passcode Protection (Levels 2 & 3)

- **FR-AUTH-001**: Users MUST set a passcode when choosing Level 2 or Level 3
- **FR-AUTH-002**: The passcode MUST be required to access the vault
- **FR-AUTH-003**: The application MUST lock after a period of inactivity (configurable)
- **FR-AUTH-004**: Users MUST be able to change their passcode
- **FR-AUTH-005**: The passcode MUST meet minimum security requirements:
  - Minimum 6 characters (Level 2)
  - Minimum 8 characters recommended for Level 3
  - Support for alphanumeric and special characters
- **FR-AUTH-006**: The application MUST implement rate limiting for failed passcode attempts
- **FR-AUTH-007**: After 5 failed attempts, the application MUST implement a temporary lockout (e.g., 5 minutes)
- **FR-AUTH-008**: Passcode MUST be hashed before storage (never stored in plaintext)
- **FR-AUTH-009**: For Level 2, passcode hash is used only for UI authentication
- **FR-AUTH-010**: For Level 3, passcode is used for both UI authentication and key derivation

#### 2.3.4 Encryption (Level 3 Only)

- **FR-ENC-001**: All files MUST be encrypted before storage when Level 3 is active
- **FR-ENC-002**: File encryption MUST use AES-256-GCM or equivalent strong encryption
- **FR-ENC-003**: Each file MUST be encrypted with a unique encryption key
- **FR-ENC-004**: The master encryption key MUST be derived from a randomly generated key (NOT the passcode)
- **FR-ENC-005**: The master key MUST itself be encrypted with a key derived from the user's passcode
- **FR-ENC-006**: Changing the passcode MUST NOT require re-encrypting all files
- **FR-ENC-007**: Changing the passcode MUST only re-encrypt the master key wrapper
- **FR-ENC-008**: File metadata (names, sizes, structure) MAY be stored unencrypted for performance, or encrypted separately
- **FR-ENC-009**: The application MUST use a secure key derivation function (e.g., PBKDF2, Argon2) for passcode-to-key conversion
- **FR-ENC-010**: Encryption/decryption MUST be performed in Web Workers to avoid blocking UI

### 2.4 Peer-to-Peer File Sharing

#### 2.4.1 WebRTC Integration
- **FR-P2P-001**: The application MUST support peer-to-peer file sharing using PeerJS/WebRTC
- **FR-P2P-002**: Users MUST be able to generate a shareable connection code/ID
- **FR-P2P-003**: Users MUST be able to connect to another device using a connection code
- **FR-P2P-004**: The application MUST establish a direct peer-to-peer connection when possible
- **FR-P2P-005**: The application MUST fall back to relay servers (TURN) when direct connection fails

#### 2.4.2 Sharing Operations
- **FR-SHARE-001**: Users MUST be able to select files/folders to share with flexible selection:
  - Individual files
  - Individual folders (with all contents)
  - Multiple files and/or folders
  - Entire vault root directory
  - Any combination of the above
- **FR-SHARE-002**: The application MUST display transfer progress for shared files
- **FR-SHARE-003**: Users MUST be able to cancel ongoing transfers
- **FR-SHARE-004**: The receiving device MUST be able to accept or reject incoming files
- **FR-SHARE-005**: The receiving device MUST see a preview of what will be received (file/folder names, sizes, count)
- **FR-SHARE-006**: Shared files MUST maintain their folder structure on the receiving end
- **FR-SHARE-007**: Shared files MUST be transferred in encrypted form (WebRTC DTLS)
- **FR-SHARE-008**: The application MUST support simultaneous connections to multiple peers
- **FR-SHARE-009**: Users MUST be able to see connected peers and their status
- **FR-SHARE-010**: When sharing folders, the application MUST transfer the complete folder hierarchy

#### 2.4.3 Connection Management
- **FR-CONN-001**: The application MUST display connection status (connecting, connected, disconnected)
- **FR-CONN-002**: The application MUST handle connection failures gracefully
- **FR-CONN-003**: Users MUST be able to disconnect from peers manually
- **FR-CONN-004**: The application MUST automatically clean up disconnected peer sessions

### 2.5 Storage Management

#### 2.5.1 Local Storage
- **FR-STORE-001**: The application MUST use IndexedDB for file storage
- **FR-STORE-002**: The application MUST display total storage used
- **FR-STORE-003**: The application MUST display available storage space
- **FR-STORE-004**: The application MUST warn users when storage is running low (e.g., 90% full)
- **FR-STORE-005**: Users MUST be able to export their entire vault (encrypted backup)
- **FR-STORE-006**: Users MUST be able to import a vault backup

#### 2.5.2 Data Management
- **FR-DATA-001**: The application MUST maintain file system metadata (folder structure, file relationships)
- **FR-DATA-002**: The application MUST handle large files efficiently (chunking for files > 100MB)
- **FR-DATA-003**: The application MUST prevent duplicate file storage (optional: content-based deduplication)

### 2.6 Progressive Web App (PWA) & Storage Persistence

#### 2.6.1 PWA Installation
- **FR-PWA-001**: The application MUST be installable as a Progressive Web App (PWA)
- **FR-PWA-002**: The application MUST provide a valid `manifest.json` with required fields:
  - `name`, `short_name`, `start_url`, `display`, `icons`, `theme_color`, `background_color`
- **FR-PWA-003**: The application MUST register a service worker for offline functionality
- **FR-PWA-004**: The application MUST detect when running as an installed PWA vs browser
- **FR-PWA-005**: The application SHOULD prompt users to install the PWA on first visit
- **FR-PWA-006**: The application MUST provide manual installation instructions if browser prompt is unavailable

#### 2.6.2 PWA Detection
- **FR-PWA-DET-001**: The application MUST detect PWA installation status using `window.matchMedia('(display-mode: standalone)')`
- **FR-PWA-DET-002**: The application MUST support iOS Safari detection using `window.navigator.standalone`
- **FR-PWA-DET-003**: The application MUST listen for `beforeinstallprompt` event to capture install prompt
- **FR-PWA-DET-004**: The application MUST listen for `appinstalled` event to detect successful installation
- **FR-PWA-DET-005**: The application MUST detect display mode changes during runtime

#### 2.6.3 Storage Persistence
- **FR-PERSIST-001**: The application MUST request persistent storage using `navigator.storage.persist()`
- **FR-PERSIST-002**: The application MUST check persistence status using `navigator.storage.persisted()`
- **FR-PERSIST-003**: The application MUST request persistence on vault initialization
- **FR-PERSIST-004**: The application MUST monitor storage quota using `navigator.storage.estimate()`
- **FR-PERSIST-005**: The application MUST warn users if persistent storage is not granted
- **FR-PERSIST-006**: The application MUST display current persistence status in settings/info panel

#### 2.6.4 PWA Enforcement Strategy
- **FR-PWA-ENF-001**: The application SHOULD strongly encourage PWA installation for data safety
- **FR-PWA-ENF-002**: The application MAY implement one of the following enforcement levels:
  - **Strict**: Block all features until PWA installed
  - **Soft** (Recommended): Show warning dialog, allow usage with persistent warning banner
  - **Optional**: Show dismissible warning banner only
- **FR-PWA-ENF-003**: If user declines PWA installation, the application MUST display persistent warning about data loss risk
- **FR-PWA-ENF-004**: The application SHOULD limit vault size (e.g., 100MB) for non-PWA users
- **FR-PWA-ENF-005**: The application MUST remind users to install PWA before uploading large files

#### 2.6.5 Installation Prompting
- **FR-PROMPT-001**: The application MUST capture the `beforeinstallprompt` event for custom install UI
- **FR-PROMPT-002**: The application MUST provide a custom "Install App" button when prompt is available
- **FR-PROMPT-003**: The application MUST show browser-specific manual installation instructions as fallback
- **FR-PROMPT-004**: The application SHOULD display installation benefits (data safety, offline access, performance)
- **FR-PROMPT-005**: The application MUST handle user's installation choice (accepted/declined)

#### 2.6.6 Persistence Monitoring
- **FR-MONITOR-001**: The application MUST check persistence status on every app launch
- **FR-MONITOR-002**: The application MUST warn users if persistence status changes from granted to denied
- **FR-MONITOR-003**: The application MUST check storage quota periodically (e.g., after each upload)
- **FR-MONITOR-004**: The application MUST warn users when storage usage exceeds 80% of quota
- **FR-MONITOR-005**: The application MUST suggest backup export when storage is critically low (>90%)

---

## 3. Non-Functional Requirements

### 3.1 Performance

- **NFR-PERF-001**: File uploads MUST process at near-native browser speed
- **NFR-PERF-002**: File encryption/decryption MUST not block the UI (use Web Workers)
- **NFR-PERF-003**: The application MUST load and display the file list within 2 seconds
- **NFR-PERF-004**: Search results MUST appear within 500ms for vaults with up to 10,000 files
- **NFR-PERF-005**: P2P file transfers MUST achieve at least 50% of theoretical maximum bandwidth

### 3.2 Usability

- **NFR-UX-001**: The application MUST be responsive and work on desktop browsers (Chrome, Firefox, Safari, Edge)
- **NFR-UX-002**: The application SHOULD be usable on tablet devices
- **NFR-UX-003**: All user actions MUST provide clear feedback
- **NFR-UX-004**: Error messages MUST be user-friendly and actionable
- **NFR-UX-005**: The application MUST follow modern web design principles (see design requirements)

### 3.3 Security

- **NFR-SEC-001**: The application MUST NOT transmit the passcode or master key over the network
- **NFR-SEC-002**: All cryptographic operations MUST use Web Crypto API
- **NFR-SEC-003**: The application MUST clear sensitive data from memory when locked
- **NFR-SEC-004**: The application MUST be resistant to common web vulnerabilities (XSS, CSRF)
- **NFR-SEC-005**: P2P connections MUST use encrypted channels (DTLS via WebRTC)

### 3.4 Reliability

- **NFR-REL-001**: The application MUST handle browser crashes gracefully (no data loss)
- **NFR-REL-002**: The application MUST validate data integrity using checksums/hashes
- **NFR-REL-003**: Failed file operations MUST be retryable
- **NFR-REL-004**: The application MUST maintain data consistency even if operations are interrupted

### 3.5 Compatibility

- **NFR-COMPAT-001**: The application MUST support modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **NFR-COMPAT-002**: The application MUST gracefully degrade if certain features are unavailable (e.g., WebRTC)
- **NFR-COMPAT-003**: The application MUST work offline (no internet connection required for local operations)

---

## 4. Technical Architecture

### 4.1 Technology Stack

#### 4.1.1 Frontend
- **HTML5**: Structure and semantic markup
- **CSS3**: Styling with modern features (Grid, Flexbox, CSS Variables)
- **Vanilla JavaScript**: Core application logic (or lightweight framework if needed)
- **Web Crypto API**: Encryption and cryptographic operations
- **IndexedDB**: Local file storage
- **PeerJS**: WebRTC abstraction for P2P connections

#### 4.1.2 Key Libraries
- **PeerJS**: Simplified WebRTC peer-to-peer connections
- **File System Access API** (optional): Native file system integration where supported

#### 4.1.3 PWA Components
- **manifest.json**: PWA configuration file with app metadata
- **Service Worker**: Enables offline functionality and caching
- **Storage Persistence API**: `navigator.storage.persist()` and `navigator.storage.persisted()`
- **Storage Quota API**: `navigator.storage.estimate()` for monitoring storage usage

### 4.2 Data Models

#### 4.2.1 File Entry
```javascript
{
  id: string,              // Unique identifier (UUID)
  name: string,            // File name
  type: string,            // MIME type
  size: number,            // Size in bytes
  encryptedSize: number,   // Encrypted size in bytes
  parentId: string | null, // Parent folder ID (null for root)
  created: timestamp,      // Creation timestamp
  modified: timestamp,     // Last modified timestamp
  encryptionKey: string,   // Encrypted file-specific key
  iv: string,              // Initialization vector for encryption
  checksum: string,        // File integrity hash
  isFolder: boolean        // True if folder, false if file
}
```

#### 4.2.2 Vault Metadata
```javascript
{
  version: string,         // Vault format version
  created: timestamp,      // Vault creation time
  masterKeyWrapped: string,// Master key encrypted with passcode-derived key
  salt: string,            // Salt for passcode key derivation
  iterations: number,      // PBKDF2 iterations
  totalFiles: number,      // Total file count
  totalSize: number        // Total storage used
}
```

#### 4.2.3 Peer Connection
```javascript
{
  peerId: string,          // Peer identifier
  status: string,          // 'connecting' | 'connected' | 'disconnected'
  connectedAt: timestamp,  // Connection timestamp
  transfers: Array         // Active file transfers
}
```

### 4.3 Encryption Architecture

#### 4.3.1 Key Hierarchy
```
User Passcode
    ↓ (PBKDF2 with salt)
Passcode-Derived Key (256-bit)
    ↓ (Decrypts)
Master Encryption Key (256-bit, randomly generated)
    ↓ (Encrypts individual file keys)
File-Specific Keys (256-bit, randomly generated per file)
    ↓ (Encrypts)
Actual File Data
```

#### 4.3.2 Passcode Change Process
1. User enters old passcode
2. Derive old passcode key → decrypt master key
3. User enters new passcode
4. Derive new passcode key → re-encrypt master key
5. Update vault metadata with new salt and wrapped key
6. **Files remain encrypted with their original keys** (no re-encryption needed)

### 4.4 Storage Structure

#### 4.4.1 IndexedDB Stores
- **files**: Encrypted file blobs
- **metadata**: File system metadata (entries, structure)
- **vault**: Vault configuration and master key
- **settings**: User preferences and app settings

### 4.5 Storage Persistence Architecture

#### 4.5.1 IndexedDB Persistence Lifecycle

**When IndexedDB Data Gets Evicted:**

1. **Storage Pressure (Most Common)**
   - Browser runs low on disk space
   - Browser needs space for other sites
   - Default storage is "best effort" (can be evicted automatically)

2. **User Actions**
   - User clears browsing data/cache
   - User clears site data for the domain
   - User uninstalls PWA

3. **Browser-Specific Policies**
   - **Chrome/Edge**: Evicts "best effort" storage after ~2 weeks of inactivity
   - **Firefox**: Evicts when disk space < 10% and site hasn't been used recently
   - **Safari**: Can evict after 7 days of inactivity (more aggressive)

4. **Incognito/Private Mode**
   - All data wiped when session ends

#### 4.5.2 Storage Persistence API

**Two Storage Buckets:**

```javascript
// "best effort" (default) - Can be evicted by browser
// "persistent" - Only cleared by explicit user action

// Request persistent storage
const granted = await navigator.storage.persist();
// Returns: true (granted) or false (denied)

// Check current status
const isPersisted = await navigator.storage.persisted();
// Returns: true or false

// Monitor storage quota
const { usage, quota } = await navigator.storage.estimate();
// usage: bytes used
// quota: total bytes available
```

#### 4.5.3 PWA Installation vs Storage Persistence

**Critical Understanding:**

| Aspect | Details |
|--------|---------|
| **API Call** | Same `navigator.storage.persist()` for both PWA and regular website |
| **Browser Decision** | PWA installation dramatically increases likelihood of grant |
| **Automatic Persistence** | PWA installation does NOT automatically call `persist()` |
| **Required Action** | Must explicitly call `persist()` regardless of PWA status |
| **Success Rate** | Regular website: 30-50%, PWA installed: 90-95% |

**Browser Heuristics for Granting Persistence:**

Chrome/Edge auto-grants `persist()` if:
- ✅ Site is installed as PWA (highest signal)
- ✅ Site is bookmarked
- ✅ User has granted notification permission
- ✅ High site engagement score (frequent visits, time spent)

Firefox auto-grants `persist()` if:
- ✅ Site is installed as PWA
- ✅ Site is bookmarked
- ✅ User has granted notifications

Safari:
- Limited `persist()` support
- PWA installation helps but less reliable

#### 4.5.4 Implementation Strategy

```javascript
// Recommended persistence flow
async function ensureStoragePersistence() {
  // 1. Check if already persistent
  const alreadyPersisted = await navigator.storage.persisted();
  if (alreadyPersisted) {
    return { success: true, method: 'already-persistent' };
  }
  
  // 2. Request persistence (required even if PWA installed)
  const granted = await navigator.storage.persist();
  if (granted) {
    return { success: true, method: 'persist-granted' };
  }
  
  // 3. If denied, check if PWA is installed
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  
  if (!isPWA) {
    // Encourage PWA installation
    return { success: false, reason: 'not-pwa', action: 'prompt-install' };
  } else {
    // Rare case: PWA installed but persist() denied
    return { success: false, reason: 'denied-despite-pwa', action: 'suggest-bookmark' };
  }
}
```

#### 4.5.5 PWA Detection Methods

```javascript
// Method 1: Display mode (most reliable)
function isPWA() {
  // Standard check
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // iOS Safari specific
  const isIOSStandalone = window.navigator.standalone === true;
  
  return isStandalone || isIOSStandalone;
}

// Method 2: Listen for display mode changes
const displayModeQuery = window.matchMedia('(display-mode: standalone)');
displayModeQuery.addEventListener('change', (e) => {
  if (e.matches) {
    console.log('App installed as PWA');
    onPWAInstalled();
  }
});

// Method 3: Capture install prompt
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showCustomInstallButton();
});

// Method 4: Detect successful installation
window.addEventListener('appinstalled', (e) => {
  console.log('PWA installed successfully');
  requestPersistence();
});
```

#### 4.5.6 Persistence Reliability Comparison

| Approach | Persistence Likelihood | Notes |
|----------|----------------------|-------|
| Default IndexedDB | 🔴 Low (30-50%) | Can be evicted anytime |
| + `persist()` request | 🟡 Medium (60-70%) | Depends on browser heuristics |
| + PWA installed | 🟢 High (90-95%) | Best option for Stash |
| + Frequent usage | 🟢 High (85-90%) | Engagement matters |
| + Bookmarked | 🟡 Medium (70-80%) | Helps but not guaranteed |

---

## 5. User Interface Design Requirements

### 5.1 Design Principles

- **Modern & Premium**: Use contemporary design patterns with rich aesthetics
- **Intuitive**: Follow familiar file explorer conventions
- **Responsive**: Adapt to different screen sizes
- **Accessible**: Support keyboard navigation and screen readers

### 5.2 Visual Design

#### 5.2.1 Color Scheme
- Support both light and dark modes
- Use a curated color palette (avoid generic primary colors)
- Implement smooth transitions between themes

#### 5.2.2 Typography
- Use modern web fonts (e.g., Inter, Roboto, Outfit)
- Maintain clear hierarchy with font sizes and weights
- Ensure readability across all text elements

#### 5.2.3 Layout
- **Sidebar**: Folder tree navigation
- **Main Panel**: File list/grid view
- **Top Bar**: Breadcrumb navigation, search, view controls
- **Bottom Bar**: Storage info, connection status
- **Modal Dialogs**: File operations, settings, sharing

#### 5.2.4 Interactions
- Smooth hover effects on interactive elements
- Micro-animations for state changes
- Drag-and-drop visual feedback
- Loading states and progress indicators

### 5.3 Components

- File/Folder icons (with type-specific icons)
- Context menus (right-click)
- Modal dialogs (upload, share, settings)
- Toast notifications (success, error, info)
- Progress bars (upload, download, transfer)
- Connection status indicator
- Lock/unlock interface

---

## 6. User Workflows

### 6.1 First-Time Setup

1. User opens the application
2. Welcome screen appears
3. **User chooses security level:**
   - **Level 1 (Basic)**: No passcode, no encryption
   - **Level 2 (Secure App UI)**: Passcode-protected, no encryption (Recommended)
   - **Level 3 (Encryption)**: Passcode-protected + file encryption
4. If Level 2 or 3 selected:
   - User is prompted to create a passcode
   - User confirms passcode
5. If Level 3 selected:
   - Vault is initialized with master encryption key
6. User is taken to empty vault interface

### 6.1.1 PWA Installation & Persistence Setup (Recommended Flow)

**Option A: Strict Enforcement**
1. User opens Stash in browser
2. App detects: Not running as PWA
3. Show blocking screen: "Install Stash to continue"
4. User clicks "Install Stash" button
5. Browser shows install prompt
6. User accepts installation
7. App detects PWA installation
8. App calls `navigator.storage.persist()` → granted
9. Continue to passcode setup

**Option B: Soft Enforcement (Recommended)**
1. User opens Stash in browser
2. App detects: Not running as PWA
3. Show warning dialog:
   - "⚠️ Data Loss Risk"
   - "Install Stash (Recommended)" button
   - "Continue Anyway (Not Recommended)" button
4. If user clicks "Install":
   - Show browser install prompt
   - Wait for installation
   - Request persistence
   - Continue to passcode setup
5. If user clicks "Continue Anyway":
   - Show persistent warning banner
   - Request `persist()` (likely denied)
   - Continue to passcode setup with warnings

**Option C: Optional (Most Permissive)**
1. User opens Stash in browser
2. App detects: Not running as PWA
3. Show dismissible banner: "Install Stash for best experience"
4. User can dismiss and continue
5. Request `persist()` anyway (may be denied)
6. Continue to passcode setup

### 6.2 Daily Usage

1. User opens application
2. Passcode entry screen appears
3. User enters passcode
4. Vault is unlocked and file list is displayed
5. User performs file operations
6. Application auto-locks after inactivity

### 6.3 File Upload

1. User clicks "Upload" or drags files into the window
2. File selection dialog appears (or drag-drop is processed)
3. User selects files
4. Files are encrypted in the background (Web Worker)
5. Progress indicator shows encryption and storage progress
6. Files appear in the current folder
7. Success notification is displayed

### 6.4 File Sharing (P2P)

#### 6.4.1 Sender
1. User selects files to share
2. User clicks "Share" button
3. Application generates a peer ID/connection code
4. User shares the code with recipient (QR code, copy-paste)
5. Application waits for connection
6. Once connected, user confirms file transfer
7. Progress indicator shows transfer status
8. Completion notification is displayed

#### 6.4.2 Receiver
1. User clicks "Receive Files"
2. User enters the connection code from sender
3. Application establishes P2P connection
4. User sees incoming file list and accepts/rejects
5. Files are received and encrypted into vault
6. Completion notification is displayed

### 6.5 Passcode Change (Level 2 & 3 Only)

1. User opens settings
2. User selects "Change Passcode"
3. User enters current passcode
4. User enters new passcode
5. User confirms new passcode
6. **For Level 2**: Passcode hash is updated
7. **For Level 3**: Master key is re-encrypted with new passcode-derived key (files remain encrypted with original keys)
8. Success notification is displayed
9. User is NOT required to re-encrypt files (Level 3 only)

---

## 7. Security Considerations

### 7.1 Threat Model

#### 7.1.1 In-Scope Threats
- Unauthorized access to browser storage
- Passcode brute-force attacks
- Man-in-the-middle attacks during P2P transfer
- XSS attacks attempting to steal keys
- Physical device theft

#### 7.1.2 Out-of-Scope Threats
- Browser/OS level vulnerabilities
- Hardware keyloggers
- Advanced persistent threats with system-level access

### 7.2 Mitigations by Security Level

#### Level 1 (Basic - No Passcode)
- **Device security**: Relies on OS user account and device encryption
- **Browser isolation**: Files isolated per origin
- **No additional protections**: Files readable in IndexedDB

#### Level 2 (Secure App UI)
- **Passcode protection**: UI locked behind passcode
- **Rate limiting**: Prevent brute-force passcode attempts
- **Auto-lock**: Minimize exposure window
- **Secure hashing**: Passcode hashed, never stored in plaintext
- **Session management**: Clear session on lock
- **Note**: Files NOT encrypted at rest

#### Level 3 (Encryption)
- **Encryption at rest**: All files encrypted in IndexedDB with AES-256-GCM
- **Strong key derivation**: PBKDF2 with high iteration count (100,000+)
- **Master key architecture**: Passcode changes don't require file re-encryption
- **Rate limiting**: Prevent brute-force passcode attempts
- **Auto-lock**: Minimize exposure window
- **Secure P2P**: WebRTC's built-in DTLS encryption
- **No key transmission**: Keys never leave the device
- **Memory clearing**: Sensitive data cleared on lock
- **Web Workers**: Encryption performed off main thread

---

## 8. Future Enhancements (Out of Scope for v1)

### 8.1 Potential Features
- **Cloud sync**: Optional encrypted cloud backup
- **Multi-device sync**: Sync vault across user's devices
- **File versioning**: Keep history of file changes
- **Shared folders**: Persistent shared folders with other users
- **Mobile apps**: Native iOS/Android applications
- **File compression**: Compress files before encryption
- **Advanced search**: Full-text search in documents
- **Trash/Recycle bin**: Soft delete with recovery option
- **File tagging**: User-defined tags for organization
- **Biometric unlock**: Fingerprint/Face ID support

---

## 9. Success Criteria

### 9.1 Minimum Viable Product (MVP)

The MVP MUST include:
- ✅ Three security levels (Basic, Secure App UI, Encryption)
- ✅ Security level selection on first launch
- ✅ Passcode-protected vault (Levels 2 & 3)
- ✅ File upload/download
- ✅ Folder creation and navigation
- ✅ File/folder rename and delete
- ✅ AES-256 encryption (Level 3 only)
- ✅ Passcode change without file re-encryption (Level 3)
- ✅ Basic P2P file sharing via PeerJS
- ✅ File explorer UI (list and grid views)
- ✅ Search functionality
- ✅ Modern, premium design
- ✅ PWA installation support
- ✅ Storage persistence management

### 9.2 Acceptance Criteria

- User can choose between three security levels
- User can store and retrieve files securely
- Passcode change completes in < 1 second (regardless of vault size, Level 3)
- P2P file transfer works between two devices on the same network
- Application works offline
- No data loss during normal operations
- UI is responsive and intuitive
- Files are encrypted and cannot be accessed without passcode (Level 3 only)
- Security level can be changed post-setup with appropriate warnings

---

## 10. Development Phases

### Phase 1: Core Infrastructure
- Set up project structure
- Implement encryption layer (Web Crypto API)
- Implement IndexedDB storage layer
- Create passcode authentication system

### Phase 2: File Management
- Build file explorer UI
- Implement file upload/download
- Implement folder operations
- Add search functionality

### Phase 3: P2P Sharing
- Integrate PeerJS
- Implement connection management
- Build file transfer mechanism
- Create sharing UI

### Phase 4: Polish & Testing
- Implement auto-lock
- Add animations and micro-interactions
- Comprehensive testing
- Performance optimization
- Security audit

---

## 11. Appendix

### 11.1 Glossary

- **Stash**: The personal file storage application/container
- **Master Key**: The primary encryption key used to encrypt individual file keys (Level 3 only)
- **Passcode**: User-chosen password to access the vault (Levels 2 & 3)
- **Security Level 1 (Basic)**: No passcode, no encryption, relies on device security
- **Security Level 2 (Secure App UI)**: Passcode-protected UI, files not encrypted at rest
- **Security Level 3 (Encryption)**: Passcode-protected UI with full file encryption
- **P2P**: Peer-to-peer, direct connection between devices
- **WebRTC**: Web Real-Time Communication, enables P2P connections
- **IndexedDB**: Browser-based database for local storage
- **PBKDF2**: Password-Based Key Derivation Function 2
- **AES-256-GCM**: Advanced Encryption Standard with 256-bit key in Galois/Counter Mode
- **PWA**: Progressive Web App, a web application that can be installed and run like a native app
- **Persistent Storage**: Browser storage that won't be automatically evicted under storage pressure
- **Best Effort Storage**: Default browser storage that can be evicted when browser needs space
- **Storage Quota**: Maximum amount of storage space available to the application
- **Service Worker**: JavaScript that runs in the background, enabling offline functionality
- **Manifest**: JSON file defining PWA metadata (name, icons, display mode, etc.)

### 11.2 References

- [Web Crypto API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [PeerJS Documentation](https://peerjs.com/docs/)
- [WebRTC Specification](https://www.w3.org/TR/webrtc/)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Progressive Web Apps (PWA) Guide](https://web.dev/progressive-web-apps/)
- [Storage API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Storage for the Web](https://web.dev/storage-for-the-web/)

---

**Document Version**: 1.3  
**Last Updated**: 2026-01-08  
**Author**: Requirements Analysis  
**Status**: Draft for Review

**Changelog:**
- v1.3: Rebranded from "MyVault" to "Stash" to better reflect flexible security options
- v1.2: Added three-tier security level system and enhanced sharing flexibility
- v1.1: Added PWA and storage persistence requirements
- v1.0: Initial requirements document

---

## 12. PWA & Storage Persistence Summary

### 12.1 Key Takeaways

1. **PWA Installation is Critical for Data Safety**
   - Increases `persist()` success rate from ~50% to ~95%
   - Provides better user experience (offline, standalone window)
   - Signals high user engagement to browser

2. **Always Call `persist()` Explicitly**
   - PWA installation does NOT automatically persist storage
   - Must call `navigator.storage.persist()` regardless of PWA status
   - Check status with `navigator.storage.persisted()`

3. **Detection is Straightforward**
   - Use `window.matchMedia('(display-mode: standalone)').matches`
   - iOS: Also check `window.navigator.standalone`
   - Listen for `beforeinstallprompt` and `appinstalled` events

4. **Recommended Enforcement: Soft Requirement**
   - Show warning dialog on first launch if not PWA
   - Allow users to continue with persistent warning banner
   - Limit features/storage for non-PWA users
   - Remind users before large uploads

5. **Monitor Storage Continuously**
   - Check quota with `navigator.storage.estimate()`
   - Warn at 80% usage, critical at 90%
   - Provide backup/export functionality
   - Verify persistence status on every launch

### 12.2 Implementation Checklist

- [ ] Create `manifest.json` with all required fields
- [ ] Register service worker for offline support
- [ ] Implement PWA detection (`isPWA()` function)
- [ ] Capture `beforeinstallprompt` event
- [ ] Create custom install UI/button
- [ ] Request `persist()` on vault initialization
- [ ] Monitor persistence status on app launch
- [ ] Check storage quota after uploads
- [ ] Show warnings for non-persistent storage
- [ ] Implement backup/export functionality
- [ ] Test across Chrome, Firefox, Safari, Edge
- [ ] Test PWA installation flow on mobile devices

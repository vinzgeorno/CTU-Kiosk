# CTU-Kiosk
A smart ticketing kiosk system for managing and tracking facility usage within the campus.

## Features

- **Offline-First Architecture**: Works without internet connection
- **ID Card Scanning**: OCR-based ID card text extraction
- **Facial Recognition**: Capture visitor photos
- **Multiple Facilities**: Support for 6+ campus facilities
- **Dynamic Pricing**: Automatic child discounts (50% off for under 12)
- **Payment Processing**: Bills and coins payment simulation
- **Ticket Generation**: QR code tickets with PDF export
- **Thermal Printing**: Direct printing to 58mm thermal printers
- **Local Database**: IndexedDB for offline data storage
- **Cloud Sync**: Automatic backup to Supabase cloud database
- **Admin Dashboard**: View tickets, statistics, and manage sync

## Cloud Sync Feature ☁️

The kiosk now supports cloud synchronization with Supabase:

- **Offline Operation**: Kiosk works without internet
- **Automatic Backup**: Sync data to cloud when online
- **Manual & Auto Sync**: Sync on-demand or every 5 minutes
- **Real-time Progress**: Track sync status and progress
- **Error Handling**: Retry failed syncs automatically
- **Multi-Kiosk Support**: Multiple kiosks can sync to same database
- **Smart Image Storage**: Images stored as actual files in Supabase Storage (not text!)

### Quick Setup
1. Create Supabase project at [supabase.com](https://supabase.com)
2. Navigate to `/admin/sync` in the app
3. Configure Supabase URL and API Key
4. Download and run SQL setup script
5. Enable auto-sync or sync manually

📖 **Detailed Guide**: See [CLOUD_SYNC_SETUP.md](./CLOUD_SYNC_SETUP.md)  
📋 **Quick Reference**: See [SYNC_QUICK_REFERENCE.md](./SYNC_QUICK_REFERENCE.md)  
🖼️ **Image Storage**: See [IMAGE_STORAGE_GUIDE.md](./IMAGE_STORAGE_GUIDE.md)

## Installation

```bash
npm install
npm start
```

## Admin Routes

- `/admin/database` - View all tickets and statistics
- `/admin/sync` - Manage cloud synchronization

## Technologies

- React 18
- React Router
- IndexedDB (offline storage)
- Supabase (cloud database)
- Tesseract.js (OCR)
- QRCode generation
- jsPDF & html2canvas
- ESC/POS thermal printing

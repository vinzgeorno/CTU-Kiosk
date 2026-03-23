# CTU-Kiosk Cloud Sync & Image Storage - Complete Guide

**Last Updated**: March 21, 2026  
**Status**: Production Ready

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Guide](#setup-guide)
4. [Configuration](#configuration)
5. [Operations](#operations)
6. [Image Storage Details](#image-storage-details)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The CTU-Kiosk system uses an **offline-first architecture** with cloud backup capabilities:

- **Primary Storage**: IndexedDB (browser-based, works offline)
- **Cloud Backup**: Supabase PostgreSQL database
- **Image Storage**: Hybrid approach (base64 locally, actual files in cloud)
- **Sync Strategy**: One-way sync from local to cloud (with future bi-directional support)

### Key Benefits
✅ Continuous Operation - Kiosk works without internet  
✅ Data Persistence - All transactions stored locally  
✅ Cloud Backup - Automatic backup when online  
✅ Scalability - Supports multiple kiosks syncing to same database  
✅ Efficient Storage - Images as files, not base64 in database  

---

## Architecture

### System Overview

```
USER INTERACTION
    ↓ (Scan ID, Capture Face, Select Facility, Payment)
    ↓
TICKET GENERATION
    ↓ (Transaction ID, QR Code, Photo, Price)
    ↓
LOCAL STORAGE (IndexedDB) ← Works OFFLINE
    ↓ synced_to_cloud: false
    ↓
[INTERNET CHECK + SYNC TRIGGER]
    ↓
SUPABASE CLOUD (PostgreSQL)
    ↓
BACKUP COMPLETE
```

### Data Storage Locations

**Local Database (IndexedDB)**
- Tickets with full data
- Images as base64 (for offline access)
- Sync flags for tracking

**Cloud Database (Supabase)**
- All ticket data
- Image URLs (pointing to storage)
- Indexed for fast queries

**Cloud Storage (Supabase Storage)**
- Actual image files (.jpg)
- Organized by ticket reference
- CDN-backed for fast access

### Sync State Flow

```
UNSYNCED (synced_to_cloud: false)
    ↓ Manual sync OR Auto-sync trigger
    ↓
SYNCING (in progress)
    ↓ Success
    ↓
SYNCED (synced_to_cloud: true, synced_at: timestamp)
    
    ↑ Failure
    └─→ Back to UNSYNCED (can retry)
```

---

## Setup Guide

### Prerequisites
- Supabase account (free tier is sufficient)
- Supabase project created
- Internet connection for initial setup

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in details:
   - Name: `CTU-Kiosk`
   - Database Password: Strong password
   - Region: Closest to your location
5. Wait 1-2 minutes for completion

### Step 2: Get Credentials

1. In Supabase dashboard: **Settings → API**
2. Copy and save:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public API Key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### Step 3: Create Storage Bucket

1. Go to **Storage** in Supabase
2. Click **"New Bucket"**
3. Configure:
   - **Name**: `kiosk-images`
   - **Public bucket**: ✅ Check this box
   - **File size limit**: 5 MB (recommended)
   - **MIME types**: `image/*` (recommended)
4. Click **"Create Bucket"**

### Step 4: Set Up Storage Policies

After bucket creation, click the bucket name and go to **Policies** tab.

**Policy 1: Upload Permission**
- Click **"New Policy"**
- Policy name: `Public Upload`
- Allowed operation: ✅ INSERT
- Target roles: ✅ anon
- USING expression: `true`
- Click **"Review"** → **"Save Policy"**

**Policy 2: Read Permission**
- Click **"New Policy"**
- Policy name: `Public Read`
- Allowed operation: ✅ SELECT
- Target roles: ✅ anon
- USING expression: `true`
- Click **"Review"** → **"Save Policy"**

### Step 5: Set Up Database Schema

1. In CTU-Kiosk app: Navigate to `/admin/sync`
2. Look for **"Download SQL Setup"** button
3. Download the SQL script
4. In Supabase: Go to **SQL Editor**
5. Create new query and paste the SQL content
6. Click **"Run"**

This creates:
- `tickets` table with all necessary columns
- Indexes for performance
- Row Level Security policies

---

## Configuration

### Accessing Sync Manager

Navigate to: `http://localhost:3000/admin/sync`

### Initial Configuration

1. Click **"Show Config"** button
2. Enter Supabase credentials:
   - **Supabase URL**: Paste Project URL from Step 2
   - **Supabase API Key**: Paste API Key from Step 2
3. Click **"Save Configuration"**
4. Click **"Test Connection"** to verify

**Success Indicators:**
- ✅ Connection test shows "Supabase connected"
- ✅ Sync statistics display ticket counts
- ✅ Status indicator appears at bottom-right

---

## Operations

### Manual Sync

**When to use**: End of day, before maintenance, on-demand backup

**Steps**:
1. Navigate to `/admin/sync`
2. Click **"Sync Now"** button
3. Watch progress bar
4. Check results (success/failure count)

### Auto-Sync

**When to use**: Continuous operation, hands-free backup

**Steps**:
1. Navigate to `/admin/sync`
2. Enable **"Enable Auto-Sync (every 5 minutes)"** checkbox
3. System automatically syncs when:
   - Internet is available
   - Auto-sync is enabled
   - Unsynced tickets exist

**Note**: Auto-sync only runs when online; offline tickets are automatically queued for next sync.

### Monitoring Sync Status

**Status Indicator** (Bottom-right corner):
- Shows current sync status
- Displays pending ticket count
- Shows last sync time
- Updates every minute

**Sync Statistics** (`/admin/sync`):
- **Total Tickets**: All tickets in local database
- **Synced to Cloud**: Successfully backed up
- **Pending Sync**: Waiting to be synced
- **Last Sync**: Timestamp of last successful sync

**Healthy Status**: Synced count = Total count (no pending)

---

## Image Storage Details

### Hybrid Storage Approach

Images are stored differently based on context:

**Local (IndexedDB)**
```
captured_image: "data:image/jpeg;base64,/9j/4AAQ..."
```
- Complete base64 encoding
- Works offline
- Stored in IndexedDB
- ~150 KB per image

**Cloud (Supabase)**
```
captured_image_url: "https://xxx.supabase.co/storage/v1/object/public/kiosk-images/ticket-images/TKT-123_1234567890.jpg"
```
- Actual image file in storage
- URL stored in database
- ~2 KB per image record
- 75x smaller than base64

### Storage Workflow

1. **Capture Phase**
   - User takes photo → Webcam captures
   - Converted to base64 data URL
   - Stored in IndexedDB with ticket

2. **Local Access**
   - Ticket retrieved from IndexedDB
   - Base64 image immediately available
   - Works completely offline

3. **Sync Phase** (When internet available)
   - Base64 converted to Blob
   - Uploaded to Supabase Storage
   - Returns public URL

4. **Cloud Storage**
   - Image stored as `.jpg` file
   - Organized: `ticket-images/{reference}_{timestamp}.jpg`
   - Database stores only the URL
   - Direct browser access via URL

### File Organization

```
Supabase Storage Structure:
kiosk-images/                           ← Bucket (Public)
└── ticket-images/                      ← Folder
    ├── TKT-1728619200000_1728619200123.jpg
    ├── TKT-1728619201000_1728619201456.jpg
    └── TKT-1728619202000_1728619202789.jpg
```

### Benefits

| Aspect | Improvement |
|--------|------------|
| Database Size | 75x smaller (URL vs base64) |
| Query Speed | Significantly faster (small fields) |
| Storage Efficiency | 10,000+ images vs ~100 with base64 |
| Accessibility | Direct URL access in browser |
| File Format | Actual .jpg files instead of text |

---

## Implementation Details

### Files Modified/Created

**New Components:**
- `src/components/SyncManager.js` - Admin interface
- `src/components/SyncManager.css` - Manager styling
- `src/components/SyncStatusIndicator.js` - Status badge
- `src/components/SyncStatusIndicator.css` - Status styling

**New Utilities:**
- `src/utils/supabaseSync.js` - Core sync logic

**Updated Files:**
- `src/App.js` - Added route: `/admin/sync`
- `src/components/DatabaseViewer.js` - Added cloud sync button
- `src/utils/indexedDatabase.js` - Added sync tracking fields

### Database Schema

**IndexedDB Changes:**
```javascript
{
  synced_to_cloud: false,  // Boolean flag
  synced_at: null,         // Timestamp of last sync
  // ... existing fields
}
```

**Supabase tickets Table:**
- `id` (BIGSERIAL PRIMARY KEY)
- `reference_number` (TEXT UNIQUE)
- `name`, `age`, `captured_image_url`
- `facility`, `payment_amount`, `original_price`
- `has_discount`, `date_created`, `date_expiry`
- `qr_code_data`, `transaction_status`
- `method_type`, `amount_inserted`, `change_given`
- `synced_at`, `created_at`, `updated_at`

**Indexes:**
- `idx_tickets_reference` on `reference_number`
- `idx_tickets_date_created` on `date_created`
- `idx_tickets_facility` on `facility`

---

## Accessing Cloud Data

### Via Supabase Dashboard

**View All Tickets:**
1. Dashboard → **Table Editor**
2. Select `tickets` table
3. Browse all synced transactions
4. Click `captured_image_url` to view image

**View Images:**
1. Dashboard → **Storage**
2. Click `kiosk-images` bucket
3. Navigate to `ticket-images/` folder
4. Click image to preview or download

### Via SQL Queries

```sql
-- Get all tickets
SELECT * FROM tickets ORDER BY date_created DESC;

-- Get tickets by facility
SELECT * FROM tickets WHERE facility = 'Swimming Pool';

-- Get revenue statistics
SELECT 
  facility,
  COUNT(*) as ticket_count,
  SUM(payment_amount) as total_revenue
FROM tickets
GROUP BY facility;

-- Get tickets by date range
SELECT * FROM tickets 
WHERE date_created BETWEEN '2025-01-01' AND '2025-12-31';

-- Get synced count
SELECT COUNT(*) as total_synced FROM tickets WHERE synced_at IS NOT NULL;
```

---

## Troubleshooting

### "Supabase not configured" Error
**Cause**: Credentials not entered or saved  
**Solution**:
1. Navigate to `/admin/sync`
2. Click "Show Config"
3. Enter URL and API Key
4. Click "Save Configuration"
5. Test connection

### "No internet connection" Error
**Cause**: Network unavailable or offline  
**Solution**:
1. Check network connection
2. Data is automatically queued for sync
3. When online, sync will proceed automatically

### "Connection test failed"
**Cause**: Invalid credentials or Supabase project issue  
**Solution**:
1. Verify URL and API Key are correct (copy from Supabase)
2. Check Supabase project is active
3. Verify SQL schema was successfully created
4. Try creating a new Supabase project if issues persist

### "Some tickets failed to sync"
**Cause**: Network interruption during sync  
**Solution**:
1. Check failed tickets list in sync results
2. Review sync logs in browser console
3. Retry sync (duplicates handled automatically)
4. Verify data integrity

### Images not uploading
**Cause**: Storage bucket not configured or policy issue  
**Solution**:
1. Verify `kiosk-images` bucket exists
2. Check bucket is marked "Public"
3. Verify upload and read policies are enabled
4. Check MIME types allow images

### Slow sync performance
**Cause**: Large number of pending tickets  
**Solution**:
1. Sync during off-peak hours
2. Enable auto-sync for continuous background sync
3. Manual sync processes fewer tickets per batch if needed
4. Check internet connection speed

---

## Quick Reference

### Admin URLs
| Feature | URL |
|---------|-----|
| Sync Manager | `/admin/sync` |
| Database Viewer | `/admin/database` |

### Status Indicators
| Symbol | Status | Action |
|--------|--------|--------|
| 🟢 | All Synced | None needed |
| 🟠 | Pending Sync | Click "Sync Now" |
| 🔴 | Offline | Connect to internet |
| ⚪ | Not Configured | Configure credentials |

### Daily Tasks
- ✅ Check sync status indicator
- ✅ Verify auto-sync is enabled
- ✅ Monitor pending count (should be 0 or low)

### Weekly Tasks
- ✅ Export local data backup
- ✅ Review Supabase storage usage
- ✅ Check sync logs for errors

### Security Best Practices
1. Keep API keys confidential
2. Limit admin page access
3. Regular exports as additional backup
4. Monitor sync logs regularly

---

## Support & Resources

**Additional Documentation:**
- See `PAYMENT_HARDWARE_INTEGRATION.md` for payment system details
- See `RaspberryPi_GPIO_Integration.md` for hardware setup
- See `REAL_HARDWARE_INTEGRATION.md` for production deployment

**For Technical Issues:**
1. Check browser console for error messages
2. Verify internet connection
3. Test Supabase connection in `/admin/sync`
4. Review sync logs
5. Check Supabase project status

**For Data Issues:**
1. Export local data as backup
2. Check Supabase Table Editor
3. Review failed tickets in sync results
4. Verify image files in storage bucket

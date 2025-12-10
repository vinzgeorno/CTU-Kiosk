# Cloud Sync Setup Guide

This guide will help you set up cloud synchronization for the CTU-Kiosk system using Supabase.

## Overview

The CTU-Kiosk system uses an **offline-first architecture**:
- All transactions are stored locally in the browser's IndexedDB
- The kiosk works perfectly without internet connection
- When internet is available, data can be synced to Supabase cloud database
- This ensures the kiosk remains operational even during network outages

## Prerequisites

1. A Supabase account (free tier is sufficient)
2. A Supabase project created

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - Name: `CTU-Kiosk` (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Select closest to your location
5. Wait for project to be created (takes 1-2 minutes)

## Step 2: Get Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public API Key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 3: Set Up Storage Bucket for Images

**Important**: Images are now stored as actual files in Supabase Storage, not as text!

1. In your Supabase project, go to **Storage**
2. Click **"New Bucket"**
3. Configure the bucket:
   - **Name**: `kiosk-images`
   - **Public bucket**: ✅ **Check this box** (required for public URLs)
   - Click **"Create Bucket"**
4. Set up storage policies:
   - Click on the `kiosk-images` bucket
   - Go to **Policies** tab
   - Click **"New Policy"**
   - **For Upload Policy**:
     - Template: Custom
     - Policy name: `Public Upload`
     - Allowed operations: `INSERT`
     - Target roles: `anon`
     - USING expression: `true`
     - Click **"Review"** then **"Save Policy"**
   - **For Read Policy**:
     - Click **"New Policy"** again
     - Policy name: `Public Read`
     - Allowed operations: `SELECT`
     - Target roles: `anon`
     - USING expression: `true`
     - Click **"Review"** then **"Save Policy"**

## Step 4: Set Up Database Schema

1. In your Supabase project, go to **SQL Editor**
2. In the CTU-Kiosk application, navigate to `/admin/sync`
3. Click **"Download SQL Setup"** button to download the SQL script
4. Open the downloaded `supabase-setup.sql` file
5. Copy the entire SQL content
6. Paste it into the Supabase SQL Editor
7. Click **"Run"** to execute the script

This will create:
- `tickets` table with `captured_image_url` column (stores image URLs, not base64)
- Indexes for better query performance
- Row Level Security (RLS) policies

## Step 5: Configure CTU-Kiosk Application

1. Navigate to `/admin/sync` in the CTU-Kiosk application
2. Click **"Show Config"** button
3. Enter your Supabase credentials:
   - **Supabase URL**: Paste the Project URL from Step 2
   - **Supabase API Key**: Paste the anon/public key from Step 2
4. Click **"Save Configuration"**
5. Click **"Test Connection"** to verify the setup

## Step 6: Sync Data

### Manual Sync
1. Navigate to `/admin/sync`
2. Click **"Sync Now"** button
3. Wait for sync to complete
4. Check the sync result

### Auto-Sync
1. Navigate to `/admin/sync`
2. Enable **"Enable Auto-Sync (every 5 minutes)"** checkbox
3. The system will automatically sync data every 5 minutes when online

## How Image Storage Works

### Local Storage (IndexedDB)
- Images stored as **base64-encoded data URLs** (text format)
- Allows offline operation
- Fast local access
- No external dependencies

### Cloud Storage (Supabase)
- Images uploaded to **Supabase Storage** as actual image files
- Stored in `kiosk-images` bucket under `ticket-images/` folder
- File naming: `{reference_number}_{timestamp}.jpg`
- Database stores only the **public URL** to the image
- Benefits:
  - ✅ Smaller database size
  - ✅ Faster queries
  - ✅ Actual image files (not text)
  - ✅ Can be viewed directly in browser
  - ✅ Better for backups and exports

### Sync Process
1. Ticket created → Image stored as base64 in IndexedDB
2. Sync triggered → Image converted to Blob
3. Image uploaded to Supabase Storage → Returns public URL
4. URL saved in database `captured_image_url` column
5. Original base64 kept in local database for offline access

## Features

### Sync Statistics
- **Total Tickets**: Total number of tickets in local database
- **Synced to Cloud**: Number of tickets already synced
- **Pending Sync**: Number of tickets waiting to be synced
- **Last Sync**: Timestamp of last successful sync

### Sync Progress
- Real-time progress bar during sync
- Shows current ticket being synced
- Displays sync statistics after completion

### Error Handling
- Failed tickets are tracked and reported
- Sync can be retried for failed tickets
- Network errors are handled gracefully

## Accessing Cloud Data

### Via Supabase Dashboard

**View Tickets:**
1. Go to your Supabase project
2. Navigate to **Table Editor**
3. Select `tickets` table
4. View all synced data
5. Click on `captured_image_url` to open the image in a new tab

**View Images:**
1. Go to **Storage** in Supabase Dashboard
2. Click on `kiosk-images` bucket
3. Navigate to `ticket-images/` folder
4. See all uploaded visitor photos as actual image files
5. Click any image to preview or download

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
```

## Security Considerations

1. **API Keys**: The anon/public key is safe to use in the browser
2. **Row Level Security**: Configured to allow public inserts and reads
3. **For Production**: Consider implementing authentication and more restrictive RLS policies

## Troubleshooting

### "Supabase not configured" Error
- Make sure you've entered and saved the Supabase URL and API Key
- Click "Test Connection" to verify credentials

### "No internet connection" Error
- Check your network connection
- The kiosk will continue to work offline
- Sync will automatically work when connection is restored

### Sync Fails for Some Tickets
- Check the failed tickets list in sync result
- Common causes:
  - Duplicate reference numbers (already synced)
  - Invalid data format
  - Network timeout
- Failed tickets can be retried by running sync again

### Database Version Mismatch
- If you see IndexedDB errors, clear browser data and refresh
- The database will be recreated with the new schema

## Backup and Recovery

### Export Local Data
1. Navigate to `/admin/database`
2. Click **"Export JSON"** or **"Export CSV"**
3. Save the file as backup

### Import to Supabase
- Use the sync feature to upload all local data
- Or manually import CSV via Supabase dashboard

### Pull from Cloud
- Future feature: Pull data from cloud to local database
- Useful for data recovery or syncing between multiple kiosks

## Best Practices

1. **Regular Syncs**: Enable auto-sync or manually sync at least once per day
2. **Monitor Sync Status**: Check sync statistics regularly
3. **Backup Data**: Export local data periodically as additional backup
4. **Test Connection**: Test Supabase connection after any configuration changes
5. **Network Planning**: Schedule manual syncs during periods of stable internet

## Support

For issues or questions:
1. Check the console for detailed error messages
2. Verify Supabase credentials and connection
3. Ensure SQL schema is properly set up
4. Check Supabase project status and quotas

## Future Enhancements

- [ ] Bi-directional sync (pull from cloud to local)
- [ ] Conflict resolution for multi-kiosk setups
- [ ] Scheduled sync times
- [ ] Sync notifications
- [ ] Batch sync optimization
- [ ] Offline queue management

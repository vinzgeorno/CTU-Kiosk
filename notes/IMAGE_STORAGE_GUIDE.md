# Image Storage Guide

## Overview

The CTU-Kiosk system uses a **hybrid image storage approach** to balance offline functionality with efficient cloud storage.

## Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    IMAGE STORAGE FLOW                       │
└─────────────────────────────────────────────────────────────┘

1. CAPTURE
   User takes photo → Webcam captures image
                    ↓
              Base64 Data URL
              (e.g., data:image/jpeg;base64,/9j/4AAQ...)

2. LOCAL STORAGE (IndexedDB)
   ┌──────────────────────────────────────┐
   │  tickets: {                          │
   │    captured_image: "data:image/..."  │  ← Full base64
   │    synced_to_cloud: false            │
   │  }                                   │
   └──────────────────────────────────────┘
   ✅ Works offline
   ✅ Immediate access
   ✅ No dependencies

3. SYNC TO CLOUD
   When internet available:
   
   Base64 → Convert to Blob → Upload to Supabase Storage
                                        ↓
                              Returns Public URL
                              (e.g., https://xxx.supabase.co/
                               storage/v1/object/public/
                               kiosk-images/ticket-images/
                               TKT-123_1234567890.jpg)

4. CLOUD STORAGE (Supabase)
   
   Storage Bucket: kiosk-images
   ┌──────────────────────────────────────┐
   │  ticket-images/                      │
   │  ├─ TKT-123_1234567890.jpg          │
   │  ├─ TKT-124_1234567891.jpg          │
   │  └─ TKT-125_1234567892.jpg          │
   └──────────────────────────────────────┘
   
   Database Table: tickets
   ┌──────────────────────────────────────┐
   │  tickets: {                          │
   │    captured_image_url: "https://..." │  ← URL only
   │    synced_to_cloud: true             │
   │  }                                   │
   └──────────────────────────────────────┘
   ✅ Actual image files
   ✅ Smaller database
   ✅ Direct browser access
   ✅ Better for backups
```

## Why This Approach?

### Local: Base64 in IndexedDB
**Advantages:**
- ✅ Works completely offline
- ✅ No external dependencies
- ✅ Immediate access
- ✅ Self-contained data
- ✅ Simple implementation

**Disadvantages:**
- ❌ Larger database size (~33% larger than binary)
- ❌ Slower queries with many images
- ❌ Not actual image files

### Cloud: Files in Supabase Storage
**Advantages:**
- ✅ Actual image files (.jpg)
- ✅ Smaller database (only stores URL)
- ✅ Faster database queries
- ✅ Direct image access via URL
- ✅ Can view/download from browser
- ✅ Better for exports and backups
- ✅ CDN-ready (Supabase uses CDN)

**Disadvantages:**
- ❌ Requires internet for upload
- ❌ Additional storage bucket setup

## Implementation Details

### Base64 to Blob Conversion

```javascript
// Extract MIME type and base64 data
const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
const contentType = matches[1]; // e.g., "image/jpeg"
const base64 = matches[2];      // actual base64 string

// Decode base64 to binary
const byteCharacters = atob(base64);

// Convert to Blob
const blob = new Blob([byteArray], { type: contentType });
```

### Upload to Supabase Storage

```javascript
// Generate unique filename
const filename = `${referenceNumber}_${timestamp}.jpg`;
const filePath = `ticket-images/${filename}`;

// Upload
await supabase.storage
  .from('kiosk-images')
  .upload(filePath, blob, {
    contentType: 'image/jpeg',
    upsert: true
  });

// Get public URL
const { data } = supabase.storage
  .from('kiosk-images')
  .getPublicUrl(filePath);

// Returns: https://xxx.supabase.co/storage/v1/object/public/kiosk-images/ticket-images/TKT-123_1234567890.jpg
```

### Database Schema

**Local (IndexedDB):**
```javascript
{
  id: 1,
  reference_number: "TKT-123456789",
  name: "John Doe",
  captured_image: "data:image/jpeg;base64,/9j/4AAQ...", // Full base64
  synced_to_cloud: false,
  // ... other fields
}
```

**Cloud (Supabase PostgreSQL):**
```sql
{
  id: 1,
  reference_number: "TKT-123456789",
  name: "John Doe",
  captured_image_url: "https://xxx.supabase.co/storage/v1/object/public/kiosk-images/ticket-images/TKT-123_1234567890.jpg",
  synced_at: "2025-10-11T10:00:00Z",
  -- ... other fields
}
```

## File Organization

### Supabase Storage Structure

```
kiosk-images/                    ← Storage Bucket (Public)
└── ticket-images/               ← Folder for all ticket images
    ├── TKT-1728619200000_1728619200123.jpg
    ├── TKT-1728619201000_1728619201456.jpg
    ├── TKT-1728619202000_1728619202789.jpg
    └── ...
```

### File Naming Convention

Format: `{reference_number}_{timestamp}.jpg`

Example: `TKT-1728619200000_1728619200123.jpg`
- `TKT-1728619200000` = Reference number
- `1728619200123` = Upload timestamp (milliseconds)
- `.jpg` = File extension

**Why this format?**
- ✅ Unique filenames (reference + timestamp)
- ✅ Easy to identify ticket
- ✅ Chronological sorting
- ✅ Prevents overwrites

## Viewing Images

### In Supabase Dashboard

1. **Via Table Editor:**
   ```
   Dashboard → Table Editor → tickets
   → Click on captured_image_url value
   → Opens image in new tab
   ```

2. **Via Storage:**
   ```
   Dashboard → Storage → kiosk-images
   → ticket-images folder
   → Click on any image to preview
   ```

### Direct URL Access

Images are publicly accessible via their URL:
```
https://[project-id].supabase.co/storage/v1/object/public/kiosk-images/ticket-images/TKT-123_1234567890.jpg
```

You can:
- Open in browser
- Embed in HTML: `<img src="url" />`
- Download directly
- Share the link

## Storage Limits

### Supabase Free Tier
- **Storage**: 1 GB
- **Bandwidth**: 2 GB/month
- **File uploads**: Unlimited count

### Estimated Capacity
Assuming average image size of 100 KB:
- **1 GB** = ~10,000 images
- **2 GB bandwidth** = ~20,000 image views/month

### Optimization Tips

1. **Compress images before upload:**
   ```javascript
   // Resize to max 640x480
   // Quality: 80%
   // Format: JPEG
   ```

2. **Clean up old images:**
   - Archive images older than 1 year
   - Move to cold storage

3. **Monitor usage:**
   - Check Supabase Dashboard → Settings → Usage
   - Set up alerts for quota limits

## Security

### Storage Bucket Policies

**Public Bucket** (Recommended for kiosk):
```sql
-- Allow anyone to upload
CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'kiosk-images');

-- Allow anyone to read
CREATE POLICY "Public Read"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'kiosk-images');
```

**Why public?**
- Kiosk needs to upload without authentication
- Images are not sensitive (visitor photos for facility access)
- Simplifies implementation

**Security Considerations:**
- Images are publicly accessible via URL
- No personal identification data in images
- URLs are not guessable (timestamp-based)
- Can add authentication later if needed

## Troubleshooting

### Upload Fails

**Error: "Bucket not found"**
- Solution: Create `kiosk-images` bucket in Supabase Storage

**Error: "Permission denied"**
- Solution: Check storage policies allow `anon` role to INSERT

**Error: "File too large"**
- Solution: Compress image before upload
- Check Supabase file size limits

### Image Not Displaying

**URL returns 404:**
- Check bucket is public
- Verify file exists in Storage
- Check URL format is correct

**Image broken in table:**
- Verify `captured_image_url` contains valid URL
- Test URL directly in browser

### Sync Issues

**Images not uploading during sync:**
- Check internet connection
- Verify Supabase credentials
- Check browser console for errors
- Ensure storage policies are set

## Migration Guide

### If You Already Have Data

If you already synced tickets with `captured_image` (base64) column:

1. **Update database schema:**
   ```sql
   ALTER TABLE tickets 
   ADD COLUMN captured_image_url TEXT;
   ```

2. **Re-sync tickets:**
   - New syncs will upload images to storage
   - Old base64 data will remain in database
   - Consider migrating old images:

3. **Migrate existing images (optional):**
   ```javascript
   // Fetch all tickets with base64 images
   // For each ticket:
   //   - Upload base64 to storage
   //   - Update captured_image_url
   //   - Clear captured_image (optional)
   ```

## Best Practices

1. **Always keep base64 in local database**
   - Ensures offline functionality
   - Allows re-sync if needed

2. **Upload images during sync**
   - Don't upload on ticket creation (might be offline)
   - Upload when syncing to cloud

3. **Use public URLs in cloud**
   - Store only URL in database
   - Reduces database size
   - Faster queries

4. **Monitor storage usage**
   - Check Supabase dashboard regularly
   - Set up usage alerts
   - Plan for scaling

5. **Compress images**
   - Reduce file size before upload
   - Use JPEG format (smaller than PNG)
   - Resize to reasonable dimensions

## FAQ

**Q: Why not store base64 in Supabase too?**
A: Base64 is ~33% larger than binary, making database slower and more expensive. Storing actual files in Storage is more efficient.

**Q: What if upload fails?**
A: The sync will retry on next attempt. Base64 is kept locally as fallback.

**Q: Can I view images offline?**
A: Yes, from local IndexedDB (base64). Cloud images require internet.

**Q: Are images backed up?**
A: Yes, Supabase automatically backs up storage. You can also export.

**Q: Can I delete old images?**
A: Yes, via Supabase Storage dashboard or API. Consider archiving first.

**Q: What about privacy?**
A: Images are public but URLs are not listed. Consider adding authentication for sensitive use cases.

## Summary

| Aspect | Local (IndexedDB) | Cloud (Supabase) |
|--------|------------------|------------------|
| Format | Base64 text | JPEG file |
| Size | ~33% larger | Optimized |
| Access | Offline | Online only |
| Speed | Fast (local) | Network dependent |
| Storage | Browser limit (~50MB) | 1GB+ (scalable) |
| Viewing | Via app | Direct URL |
| Backup | Manual export | Automatic |
| Cost | Free | Free tier: 1GB |

**Recommendation**: Use both! Base64 locally for offline, files in cloud for efficiency.

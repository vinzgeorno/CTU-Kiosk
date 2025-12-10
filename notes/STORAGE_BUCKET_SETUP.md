# Supabase Storage Bucket Setup - Step by Step

## Quick Visual Guide

This guide shows you exactly how to set up the storage bucket for images.

---

## Step 1: Navigate to Storage

```
Supabase Dashboard
├─ Your Project
   ├─ Table Editor
   ├─ Authentication
   ├─ Storage  ← Click here
   ├─ SQL Editor
   └─ ...
```

---

## Step 2: Create New Bucket

Click the **"New Bucket"** button (usually green, top right)

---

## Step 3: Configure Bucket

Fill in the form:

```
┌─────────────────────────────────────────┐
│  Create a new bucket                    │
├─────────────────────────────────────────┤
│                                         │
│  Name *                                 │
│  ┌─────────────────────────────────┐   │
│  │ kiosk-images                    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ☑ Public bucket                       │
│  (Check this box!)                     │
│                                         │
│  File size limit (optional)            │
│  ┌─────────────────────────────────┐   │
│  │ 5                               │ MB │
│  └─────────────────────────────────┘   │
│                                         │
│  Allowed MIME types (optional)         │
│  ┌─────────────────────────────────┐   │
│  │ image/*                         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [ Cancel ]  [ Create Bucket ]         │
│                                         │
└─────────────────────────────────────────┘
```

**Important:**
- ✅ Name must be exactly: `kiosk-images`
- ✅ Must check "Public bucket"
- ✅ File size limit: 5 MB (recommended)
- ✅ MIME types: `image/*` (recommended)

Click **"Create Bucket"**

---

## Step 4: Set Up Upload Policy

After bucket is created:

1. Click on the `kiosk-images` bucket
2. Click the **"Policies"** tab
3. Click **"New Policy"**

### Policy 1: Allow Uploads

```
┌─────────────────────────────────────────┐
│  Create a new policy                    │
├─────────────────────────────────────────┤
│                                         │
│  Policy name *                          │
│  ┌─────────────────────────────────┐   │
│  │ Public Upload                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Allowed operation *                    │
│  ☑ INSERT                              │
│  ☐ SELECT                              │
│  ☐ UPDATE                              │
│  ☐ DELETE                              │
│                                         │
│  Target roles *                         │
│  ☑ anon                                │
│  ☐ authenticated                       │
│  ☐ service_role                        │
│                                         │
│  USING expression                       │
│  ┌─────────────────────────────────┐   │
│  │ true                            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [ Cancel ]  [ Review ]  [ Save ]      │
│                                         │
└─────────────────────────────────────────┘
```

**Settings:**
- Policy name: `Public Upload`
- Allowed operation: ✅ INSERT
- Target roles: ✅ anon
- USING expression: `true`

Click **"Review"** → **"Save Policy"**

---

## Step 5: Set Up Read Policy

Click **"New Policy"** again for the second policy:

### Policy 2: Allow Reads

```
┌─────────────────────────────────────────┐
│  Create a new policy                    │
├─────────────────────────────────────────┤
│                                         │
│  Policy name *                          │
│  ┌─────────────────────────────────┐   │
│  │ Public Read                     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Allowed operation *                    │
│  ☐ INSERT                              │
│  ☑ SELECT                              │
│  ☐ UPDATE                              │
│  ☐ DELETE                              │
│                                         │
│  Target roles *                         │
│  ☑ anon                                │
│  ☐ authenticated                       │
│  ☐ service_role                        │
│                                         │
│  USING expression                       │
│  ┌─────────────────────────────────┐   │
│  │ true                            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [ Cancel ]  [ Review ]  [ Save ]      │
│                                         │
└─────────────────────────────────────────┘
```

**Settings:**
- Policy name: `Public Read`
- Allowed operation: ✅ SELECT
- Target roles: ✅ anon
- USING expression: `true`

Click **"Review"** → **"Save Policy"**

---

## Step 6: Verify Setup

You should now see:

```
Storage > kiosk-images > Policies

┌─────────────────────────────────────────────────────┐
│  Policies (2)                                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ✓ Public Upload                                   │
│    INSERT for anon                                 │
│                                                     │
│  ✓ Public Read                                     │
│    SELECT for anon                                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Verification Checklist

- [ ] Bucket named `kiosk-images` exists
- [ ] Bucket is marked as "Public"
- [ ] "Public Upload" policy exists (INSERT for anon)
- [ ] "Public Read" policy exists (SELECT for anon)
- [ ] Both policies show ✓ (enabled)

---

## Common Mistakes

### ❌ Bucket Not Public
**Problem**: Forgot to check "Public bucket"
**Fix**: 
1. Click bucket settings (gear icon)
2. Check "Public bucket"
3. Save

### ❌ Wrong Bucket Name
**Problem**: Named it something other than `kiosk-images`
**Fix**: 
1. Delete wrong bucket
2. Create new one with correct name
3. Or update code to match your bucket name

### ❌ Missing Policies
**Problem**: Didn't create upload/read policies
**Fix**: Follow Steps 4 & 5 above

### ❌ Wrong Role
**Problem**: Set policies for `authenticated` instead of `anon`
**Fix**: 
1. Edit policy
2. Change target role to `anon`
3. Save

---

## Testing the Setup

### Test Upload (via SQL Editor)

```sql
-- This should work if setup is correct
SELECT storage.upload(
  'kiosk-images',
  'test.jpg',
  decode('base64data', 'base64')
);
```

### Test Read (via Browser)

After uploading an image, try accessing:
```
https://[your-project-id].supabase.co/storage/v1/object/public/kiosk-images/test.jpg
```

Should display the image (not 404 or permission error)

---

## Alternative: Using Supabase CLI

If you prefer command line:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Create bucket
supabase storage create kiosk-images --public

# Add policies
supabase storage policy create kiosk-images "Public Upload" \
  --operation INSERT \
  --role anon \
  --check true

supabase storage policy create kiosk-images "Public Read" \
  --operation SELECT \
  --role anon \
  --using true
```

---

## What Happens After Setup?

Once configured:

1. **Kiosk creates ticket** → Image stored as base64 in IndexedDB
2. **Sync triggered** → Image uploaded to `kiosk-images/ticket-images/`
3. **Upload succeeds** → Returns public URL
4. **URL saved** → Stored in database `captured_image_url` column
5. **Image accessible** → Can view via URL in browser

---

## Folder Structure After First Sync

```
kiosk-images/
└── ticket-images/
    ├── TKT-1728619200000_1728619200123.jpg
    ├── TKT-1728619201000_1728619201456.jpg
    └── ...
```

The `ticket-images/` folder is created automatically by the app.

---

## Security Notes

**Why Public?**
- Kiosk needs to upload without user authentication
- Images are not sensitive (facility access photos)
- URLs are not guessable (timestamp-based)

**For Production:**
- Consider adding file size validation
- Monitor storage usage
- Set up usage alerts
- Consider adding rate limiting

---

## Need Help?

**Bucket won't create:**
- Check you have permissions in Supabase project
- Verify project is not on free tier limit

**Policies won't save:**
- Check USING expression syntax
- Ensure role is spelled correctly (`anon` not `anonymous`)

**Images won't upload:**
- Verify bucket is public
- Check policies are enabled (green checkmark)
- Test with simple file first

---

## Summary

✅ **What you need:**
1. Bucket named `kiosk-images`
2. Bucket set to public
3. Upload policy (INSERT for anon)
4. Read policy (SELECT for anon)

✅ **What you get:**
- Actual image files in cloud storage
- Public URLs to access images
- Efficient database (stores URLs not base64)
- Better performance and scalability

**Time to complete:** 5 minutes  
**Difficulty:** Easy  
**Required:** Yes (for image sync to work)

---

**Next Step:** Run the SQL setup script to create the database table!

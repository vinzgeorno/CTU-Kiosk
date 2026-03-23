# Supabase Setup & Sync Configuration Guide

This guide will help you set up Supabase to sync CTU-Kiosk transaction data to the cloud.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Project Setup](#supabase-project-setup)
3. [Database Table Creation](#database-table-creation)
4. [Configure the App](#configure-the-app)
5. [Testing the Sync](#testing-the-sync)
6. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## Prerequisites

You need:
- A [Supabase account](https://app.supabase.io) (sign up if you don't have one)
- Your Supabase **Project URL** and **API Key**
- The CTU-Kiosk app running on `http://localhost:3000`

---

## Supabase Project Setup

### Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.io)
2. Click **"New Project"**
3. Fill in the details:
   - **Project Name**: `ctu-kiosk`
   - **Database Password**: Create a strong password
   - **Region**: Select closest to your location
4. Click **"Create new project"**
5. Wait for provisioning (2-3 minutes)

### Step 2: Get Your Credentials

Once your project is created:

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL** (the `supabase_url`)
   - **Anon Public Key** (the `supabase_key`)

Save these somewhere safe - you'll use them to configure the app.

---

## Database Table Creation

### Step 1: Open SQL Editor

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **"New Query"**

### Step 2: Create the New Transactions Table

Copy and paste the entire SQL code below into the SQL editor:

```sql
-- ============================================
-- CTU-Kiosk Simplified Transactions Table
-- ============================================

-- Create the main transactions table
CREATE TABLE IF NOT EXISTS tickets_new (
  id BIGSERIAL PRIMARY KEY,
  reference_number TEXT UNIQUE NOT NULL,
  age INTEGER,
  facility TEXT NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  transaction_status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_new_reference ON tickets_new(reference_number);
CREATE INDEX IF NOT EXISTS idx_tickets_new_facility ON tickets_new(facility);
CREATE INDEX IF NOT EXISTS idx_tickets_new_created ON tickets_new(created_at);

-- Enable Row Level Security
ALTER TABLE tickets_new ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public inserts (for kiosk)
CREATE POLICY "Allow public inserts on tickets_new" ON tickets_new
  FOR INSERT TO anon
  WITH CHECK (true);

-- Policy: Allow public reads (for kiosk)
CREATE POLICY "Allow public reads on tickets_new" ON tickets_new
  FOR SELECT TO anon
  USING (true);

-- Policy: Allow public updates (for marking synced)
CREATE POLICY "Allow public updates on tickets_new" ON tickets_new
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Test data (optional - can delete later)
-- ============================================
-- INSERT INTO tickets_new (reference_number, age, facility, amount_paid) 
-- VALUES ('TEST-001', 25, 'Oval', 20.00);
```

### Step 3: Execute the SQL

1. Click the **"Run"** button (or press Ctrl+Enter)
2. You should see a success message
3. Check the **"All Tables"** list in the left sidebar - you should now see `tickets_new`

### Step 4: Verify the Table

1. Click on `tickets_new` in the left sidebar
2. You should see the columns: `id`, `reference_number`, `age`, `facility`, `amount_paid`, `transaction_status`, `created_at`, `synced_at`

---

## Configure the App

### Step 1: Open Database Viewer

1. Start your kiosk app: `http://localhost:3000`
2. Navigate to **Admin → Cloud Sync** (or click the Cloud Sync button in Database Viewer)

### Step 2: Configure Supabase Credentials

1. You should see a **"Configure Supabase Connection"** form
2. Fill in:
   - **Supabase URL**: Paste the Project URL you copied earlier
   - **Supabase API Key**: Paste the Anon Public Key you copied earlier
3. Click **"Save Configuration"**

You should see a success message: ✓ "Configuration saved successfully!"

### Step 3: Test the Connection

1. Click **"Test Connection"** button
2. You should see: ✓ "Connection test successful!"

If you get an error, double-check your URL and API Key are correct.

---

## Testing the Sync

### Manual Test

1. Go back to the **main kiosk page** (`http://localhost:3000`)
2. Complete a test transaction:
   - Select a building/facility
   - Enter your age
   - Make payment (use test payment if in test mode)
3. Complete the transaction

### Check Local Database

1. Go to **Database Viewer**
2. You should see your new transaction in the list
3. Look at the **"Sync Status"** column:
   - 🟢 **Synced** = Data uploaded to Supabase
   - 🟡 **Unsynced** = Data saved locally, waiting to sync

### Check Supabase Cloud

1. Go back to [Supabase Dashboard](https://app.supabase.io)
2. Select your CTU-Kiosk project
3. Click **"Table Editor"** in left sidebar
4. Click on **`tickets_new`** table
5. You should see your test transaction with:
   - `reference_number`
   - `age`
   - `facility`
   - `amount_paid`
   - `synced_at` timestamp

---

## Monitoring & Troubleshooting

### View Sync Statistics

In the **Sync Manager**:
- See total tickets synced
- See last sync time
- View connection status
- Monitor unsynced tickets count

### Common Issues

#### ❌ "Failed to initialize Supabase"
- **Solution**: Check your URL and API Key are correct and fully copied (no extra spaces)

#### ❌ "No internet connection"
- **Solution**: Check your internet connection. Sync will happen automatically when online again

#### ❌ "Sync already in progress"
- **Solution**: Wait a few seconds and try again. The system is still syncing from the previous request

#### ❌ Data not appearing in Supabase
1. Verify sync status shows "Synced" (not "Unsynced")
2. Check if Supabase table has the data:
   - Table Editor → `tickets_new` → should show rows
3. Try manual sync from Database Viewer

### Auto-Sync Status

- ✓ **Enabled by default** - Syncs every 5 minutes automatically
- ✓ **Immediate sync** - When transaction completes (if online)
- ✓ **Offline support** - Data saved locally, syncs when online

### Manual Sync Options

In **Database Viewer**:

1. **Sync all unsynced**: Filter by "Unsynced" → Click "Sync Now"
2. **Sync single transaction**: Click the sync icon next to any unsynced transaction

---

## Data Fields Explained

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto | System ID |
| `reference_number` | Text | Unique transaction ID (matches ticket reference) |
| `age` | Integer | Visitor age |
| `facility` | Text | Facility name (e.g., "Oval", "Basketball Gym") |
| `amount_paid` | Decimal | Amount paid in Philippine Pesos |
| `transaction_status` | Text | Status (always "completed" for now) |
| `created_at` | Timestamp | When transaction occurred |
| `synced_at` | Timestamp | When synced to Supabase |

---

## Real-Time Queries

You can now query your data from Supabase SQL Editor:

### Total Revenue
```sql
SELECT SUM(amount_paid) as total_revenue 
FROM tickets_new;
```

### Revenue by Facility
```sql
SELECT facility, COUNT(*) as count, SUM(amount_paid) as total
FROM tickets_new
GROUP BY facility
ORDER BY total DESC;
```

### Transactions by Age Group
```sql
SELECT 
  CASE 
    WHEN age < 13 THEN 'Child' 
    WHEN age < 18 THEN 'Teen'
    WHEN age < 60 THEN 'Adult'
    ELSE 'Senior'
  END as age_group,
  COUNT(*) as count,
  SUM(amount_paid) as total
FROM tickets_new
WHERE age IS NOT NULL
GROUP BY age_group;
```

### Recent Transactions
```sql
SELECT reference_number, age, facility, amount_paid, created_at
FROM tickets_new
ORDER BY created_at DESC
LIMIT 10;
```

---

## Support & Next Steps

### What's Working Now:
- ✓ Local transaction storage (IndexedDB)
- ✓ Automatic sync to Supabase
- ✓ Offline-first capability
- ✓ Manual sync options
- ✓ Database viewer with sync status

### Optional Enhancements:
- Add analytics dashboard
- Set up Supabase real-time subscriptions
- Create backup export functionality
- Set up data retention policies
- Add more detailed reporting

---

## Quick Reference

| Task | Location |
|------|----------|
| View transactions | Database Viewer → Kiosk App |
| Configure Supabase | Admin → Cloud Sync |
| Check sync status | Database Viewer → Sync Status column |
| Manage Supabase | Supabase Dashboard → Table Editor |
| View Supabase data | Supabase Dashboard → `tickets_new` table |
| Test transaction | Main kiosk page → Complete payment |

---

**Last Updated**: March 23, 2026  
**Version**: 1.0  
**Status**: Production Ready

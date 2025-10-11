// Supabase Cloud Sync Utility for CTU-Kiosk System
// Syncs local IndexedDB data to Supabase cloud database

import { createClient } from '@supabase/supabase-js';
import indexedDatabase from './indexedDatabase';

class SupabaseSync {
  constructor() {
    this.supabase = null;
    this.isConfigured = false;
    this.syncInProgress = false;
  }

  // Initialize Supabase client
  initialize(supabaseUrl, supabaseKey) {
    try {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL and Key are required');
      }

      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.isConfigured = true;
      console.log('Supabase client initialized');
      return { success: true };
    } catch (error) {
      console.error('Supabase initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  // Load configuration from localStorage
  loadConfig() {
    try {
      const config = localStorage.getItem('supabase_config');
      if (config) {
        const { url, key } = JSON.parse(config);
        return this.initialize(url, key);
      }
      return { success: false, error: 'No configuration found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Save configuration to localStorage
  saveConfig(supabaseUrl, supabaseKey) {
    try {
      localStorage.setItem('supabase_config', JSON.stringify({
        url: supabaseUrl,
        key: supabaseKey
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Check internet connectivity
  async checkConnectivity() {
    if (!navigator.onLine) {
      return { connected: false, error: 'No internet connection' };
    }

    try {
      // Try to ping Supabase
      const response = await fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        cache: 'no-cache'
      });
      return { connected: true };
    } catch (error) {
      return { connected: false, error: 'Network unreachable' };
    }
  }

  // Get unsynced tickets from local database
  async getUnsyncedTickets() {
    try {
      await indexedDatabase.initialize();
      const result = await indexedDatabase.getAllTickets(1000);
      
      if (result.success) {
        // Filter tickets that haven't been synced yet
        // We'll track sync status using a new field
        const unsynced = result.tickets.filter(ticket => !ticket.synced_to_cloud);
        return { success: true, tickets: unsynced };
      }
      
      return { success: false, error: 'Failed to get local tickets' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Convert base64 data URL to Blob
  base64ToBlob(base64Data) {
    try {
      // Extract the base64 content and mime type
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 data');
      }

      const contentType = matches[1];
      const base64 = matches[2];
      
      // Decode base64 to binary
      const byteCharacters = atob(base64);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      return new Blob(byteArrays, { type: contentType });
    } catch (error) {
      console.error('Error converting base64 to blob:', error);
      return null;
    }
  }

  // Upload image to Supabase Storage
  async uploadImage(imageData, referenceNumber) {
    try {
      if (!imageData || !imageData.startsWith('data:image')) {
        return { success: false, url: null };
      }

      // Convert base64 to blob
      const blob = this.base64ToBlob(imageData);
      if (!blob) {
        throw new Error('Failed to convert image to blob');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${referenceNumber}_${timestamp}.jpg`;
      const filePath = `ticket-images/${filename}`;

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from('kiosk-images')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('kiosk-images')
        .getPublicUrl(filePath);

      return { success: true, url: urlData.publicUrl };
    } catch (error) {
      console.error('Error uploading image:', error);
      // Return original base64 as fallback
      return { success: false, url: imageData };
    }
  }

  // Sync a single ticket to Supabase
  async syncTicket(ticket) {
    try {
      if (!this.isConfigured) {
        const loadResult = this.loadConfig();
        if (!loadResult.success) {
          throw new Error('Supabase not configured');
        }
      }

      // Upload image to Supabase Storage if exists
      let imageUrl = null;
      if (ticket.captured_image) {
        const uploadResult = await this.uploadImage(
          ticket.captured_image,
          ticket.reference_number
        );
        imageUrl = uploadResult.url;
      }

      // Prepare ticket data for Supabase
      const ticketData = {
        reference_number: ticket.reference_number,
        name: ticket.name,
        age: ticket.age,
        captured_image_url: imageUrl, // Store URL instead of base64
        facility: ticket.facility,
        payment_amount: ticket.payment_amount,
        original_price: ticket.original_price,
        has_discount: ticket.has_discount === 1,
        date_created: ticket.date_created,
        date_expiry: ticket.date_expiry,
        qr_code_data: ticket.qr_code_data,
        transaction_status: ticket.transaction_status,
        method_type: ticket.method_type,
        amount_inserted: ticket.amount_inserted,
        change_given: ticket.change_given,
        synced_at: new Date().toISOString()
      };

      // Insert into Supabase (upsert to handle duplicates)
      const { data, error } = await this.supabase
        .from('tickets')
        .upsert(ticketData, { 
          onConflict: 'reference_number',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error syncing ticket:', error);
      return { success: false, error: error.message };
    }
  }

  // Sync all unsynced tickets to cloud
  async syncAllTickets(progressCallback = null) {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;

    try {
      // Check connectivity
      const connectivityCheck = await this.checkConnectivity();
      if (!connectivityCheck.connected) {
        throw new Error(connectivityCheck.error);
      }

      // Get unsynced tickets
      const unsyncedResult = await this.getUnsyncedTickets();
      if (!unsyncedResult.success) {
        throw new Error(unsyncedResult.error);
      }

      const tickets = unsyncedResult.tickets;
      const totalTickets = tickets.length;

      if (totalTickets === 0) {
        return { 
          success: true, 
          message: 'No tickets to sync',
          synced: 0,
          failed: 0,
          total: 0
        };
      }

      let syncedCount = 0;
      let failedCount = 0;
      const failedTickets = [];

      // Sync each ticket
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: totalTickets,
            ticket: ticket.reference_number
          });
        }

        const syncResult = await this.syncTicket(ticket);
        
        if (syncResult.success) {
          syncedCount++;
          // Mark ticket as synced in local database
          await this.markTicketAsSynced(ticket.reference_number);
        } else {
          failedCount++;
          failedTickets.push({
            reference: ticket.reference_number,
            error: syncResult.error
          });
        }
      }

      return {
        success: true,
        synced: syncedCount,
        failed: failedCount,
        total: totalTickets,
        failedTickets: failedTickets
      };

    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, error: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Mark ticket as synced in local database
  async markTicketAsSynced(referenceNumber) {
    try {
      await indexedDatabase.initialize();
      
      const transaction = indexedDatabase.db.transaction(['tickets'], 'readwrite');
      const store = transaction.objectStore('tickets');
      const index = store.index('reference_number');
      
      const getRequest = index.get(referenceNumber);
      
      return new Promise((resolve, reject) => {
        getRequest.onsuccess = () => {
          const ticket = getRequest.result;
          if (ticket) {
            ticket.synced_to_cloud = true;
            ticket.synced_at = new Date().toISOString();
            
            const updateRequest = store.put(ticket);
            updateRequest.onsuccess = () => resolve({ success: true });
            updateRequest.onerror = () => reject(updateRequest.error);
          } else {
            resolve({ success: false, error: 'Ticket not found' });
          }
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      });
    } catch (error) {
      console.error('Error marking ticket as synced:', error);
      return { success: false, error: error.message };
    }
  }

  // Get sync statistics
  async getSyncStats() {
    try {
      await indexedDatabase.initialize();
      const result = await indexedDatabase.getAllTickets(1000);
      
      if (result.success) {
        const total = result.tickets.length;
        const synced = result.tickets.filter(t => t.synced_to_cloud).length;
        const unsynced = total - synced;
        
        return {
          success: true,
          total,
          synced,
          unsynced,
          lastSync: this.getLastSyncTime()
        };
      }
      
      return { success: false, error: 'Failed to get stats' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get last sync time
  getLastSyncTime() {
    return localStorage.getItem('last_sync_time') || null;
  }

  // Update last sync time
  updateLastSyncTime() {
    localStorage.setItem('last_sync_time', new Date().toISOString());
  }

  // Test Supabase connection
  async testConnection() {
    try {
      if (!this.isConfigured) {
        const loadResult = this.loadConfig();
        if (!loadResult.success) {
          throw new Error('Supabase not configured');
        }
      }

      // Try to query the tickets table
      const { data, error } = await this.supabase
        .from('tickets')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Create Supabase tables (run this once to set up cloud database)
  async setupCloudDatabase() {
    try {
      if (!this.isConfigured) {
        throw new Error('Supabase not configured');
      }

      // Note: This requires RLS policies to be set up in Supabase dashboard
      // The actual table creation should be done via Supabase SQL editor
      
      const sqlScript = `
-- ============================================
-- CTU-Kiosk Supabase Setup Script
-- ============================================

-- Step 1: Create Storage Bucket for Images
-- Note: This must be done via Supabase Dashboard > Storage
-- Bucket name: kiosk-images
-- Public: Yes (for public URL access)
-- File size limit: 5MB
-- Allowed MIME types: image/*

-- Step 2: Create Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
  id BIGSERIAL PRIMARY KEY,
  reference_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  captured_image_url TEXT, -- URL to image in Supabase Storage
  facility TEXT NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  has_discount BOOLEAN DEFAULT false,
  date_created TIMESTAMPTZ NOT NULL,
  date_expiry TIMESTAMPTZ NOT NULL,
  qr_code_data TEXT,
  transaction_status TEXT DEFAULT 'completed',
  method_type TEXT,
  amount_inserted DECIMAL(10,2),
  change_given DECIMAL(10,2),
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_tickets_reference ON tickets(reference_number);
CREATE INDEX IF NOT EXISTS idx_tickets_date_created ON tickets(date_created);
CREATE INDEX IF NOT EXISTS idx_tickets_facility ON tickets(facility);

-- Step 4: Enable Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies
-- Allow public inserts (kiosk can create tickets)
CREATE POLICY "Allow public inserts" ON tickets
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow public reads (kiosk can read tickets)
CREATE POLICY "Allow public reads" ON tickets
  FOR SELECT TO anon
  USING (true);

-- Allow public updates (for sync operations)
CREATE POLICY "Allow public updates" ON tickets
  FOR UPDATE TO anon
  USING (true);

-- ============================================
-- IMPORTANT: Manual Steps Required
-- ============================================
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New Bucket"
-- 3. Name: kiosk-images
-- 4. Public: YES (check the box)
-- 5. Click "Create Bucket"
-- 6. Click on the bucket > Policies
-- 7. Add policy for public uploads:
--    - Policy name: "Public Upload"
--    - Allowed operations: INSERT
--    - Target roles: anon
--    - USING expression: true
-- 8. Add policy for public reads:
--    - Policy name: "Public Read"
--    - Allowed operations: SELECT
--    - Target roles: anon
--    - USING expression: true
-- ============================================
      `;

      return {
        success: true,
        message: 'Please run the following SQL in your Supabase SQL Editor:',
        sql: sqlScript
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Pull data from cloud to local (for data recovery or syncing from other kiosks)
  async pullFromCloud(startDate = null, endDate = null) {
    try {
      if (!this.isConfigured) {
        const loadResult = this.loadConfig();
        if (!loadResult.success) {
          throw new Error('Supabase not configured');
        }
      }

      let query = this.supabase.from('tickets').select('*');

      if (startDate && endDate) {
        query = query.gte('date_created', startDate).lte('date_created', endDate);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { success: true, tickets: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const supabaseSync = new SupabaseSync();

export default supabaseSync;

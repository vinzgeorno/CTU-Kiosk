// IndexedDB Database Utility for CTU-Kiosk System
// Alternative to SQLite that works natively in browsers

class IndexedDatabase {
  constructor() {
    this.dbName = 'CTU_Kiosk_DB';
    this.version = 1;
    this.db = null;
    this.isInitialized = false;
  }

  // Initialize the database
  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Database failed to open');
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('Database opened successfully');
        resolve({ success: true });
      };

      request.onupgradeneeded = (e) => {
        this.db = e.target.result;

        // Create tickets object store
        if (!this.db.objectStoreNames.contains('tickets')) {
          const ticketStore = this.db.createObjectStore('tickets', {
            keyPath: 'id',
            autoIncrement: true
          });
          
          // Create indexes
          ticketStore.createIndex('reference_number', 'reference_number', { unique: true });
          ticketStore.createIndex('name', 'name', { unique: false });
          ticketStore.createIndex('facility', 'facility', { unique: false });
          ticketStore.createIndex('date_created', 'date_created', { unique: false });
          ticketStore.createIndex('transaction_status', 'transaction_status', { unique: false });
        }

        // Create facilities object store
        if (!this.db.objectStoreNames.contains('facilities')) {
          const facilityStore = this.db.createObjectStore('facilities', {
            keyPath: 'id',
            autoIncrement: true
          });
          
          facilityStore.createIndex('name', 'name', { unique: true });
        }

        // Create payment_methods object store
        if (!this.db.objectStoreNames.contains('payment_methods')) {
          const paymentStore = this.db.createObjectStore('payment_methods', {
            keyPath: 'id',
            autoIncrement: true
          });
          
          paymentStore.createIndex('ticket_id', 'ticket_id', { unique: false });
        }

        console.log('Database setup complete');
      };
    });
  }

  // Insert default facilities
  async insertDefaultFacilities() {
    try {
      const facilities = [
        { name: 'Oval', base_price: 20, description: 'Running track and field area', is_active: true },
        { name: 'Basketball Gym/Kadasig Gym', base_price: 20, description: 'Indoor basketball court', is_active: true },
        { name: 'Badminton Court', base_price: 20, description: 'Indoor badminton facility', is_active: true },
        { name: 'Tennis Court', base_price: 20, description: 'Outdoor tennis court', is_active: true },
        { name: 'Swimming Pool', base_price: 100, description: 'Olympic-size swimming pool', is_active: true },
        { name: 'Fitness Gym', base_price: 50, description: 'Weight training and cardio equipment', is_active: true }
      ];

      const transaction = this.db.transaction(['facilities'], 'readwrite');
      const store = transaction.objectStore('facilities');

      // Check if facilities already exist
      const countRequest = store.count();
      const count = await new Promise((resolve) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
      });

      if (count === 0) {
        for (const facility of facilities) {
          facility.created_at = new Date().toISOString();
          store.add(facility);
        }
        console.log('Default facilities inserted');
      }

      return { success: true };
    } catch (error) {
      console.error('Error inserting default facilities:', error);
      return { success: false, error: error.message };
    }
  }

  // Insert a new ticket
  async insertTicket(ticketData) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const {
        referenceNumber,
        name,
        age,
        capturedImage,
        facility,
        paymentAmount,
        originalPrice,
        hasDiscount,
        dateCreated,
        dateExpiry,
        qrCodeData,
        paymentMethod,
        amountInserted,
        changeGiven
      } = ticketData;

      const ticket = {
        reference_number: referenceNumber,
        name: name,
        age: age || null,
        captured_image: capturedImage || null,
        facility: facility,
        payment_amount: paymentAmount,
        original_price: originalPrice || paymentAmount,
        has_discount: hasDiscount ? 1 : 0,
        date_created: dateCreated,
        date_expiry: dateExpiry,
        qr_code_data: qrCodeData || null,
        transaction_status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const transaction = this.db.transaction(['tickets', 'payment_methods'], 'readwrite');
      const ticketStore = transaction.objectStore('tickets');
      const paymentStore = transaction.objectStore('payment_methods');

      // Insert ticket
      const ticketRequest = ticketStore.add(ticket);
      const ticketId = await new Promise((resolve, reject) => {
        ticketRequest.onsuccess = () => resolve(ticketRequest.result);
        ticketRequest.onerror = () => reject(ticketRequest.error);
      });

      // Insert payment method information
      if (paymentMethod && amountInserted) {
        const paymentData = {
          ticket_id: ticketId,
          method_type: paymentMethod,
          amount_inserted: amountInserted,
          change_given: changeGiven || 0,
          created_at: new Date().toISOString()
        };

        paymentStore.add(paymentData);
      }

      console.log('Ticket inserted successfully with ID:', ticketId);
      return { success: true, ticketId, referenceNumber };
    } catch (error) {
      console.error('Error inserting ticket:', error);
      return { success: false, error: error.message };
    }
  }

  // Get ticket by reference number
  async getTicketByReference(referenceNumber) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const transaction = this.db.transaction(['tickets', 'payment_methods'], 'readonly');
      const ticketStore = transaction.objectStore('tickets');
      const paymentStore = transaction.objectStore('payment_methods');
      
      const index = ticketStore.index('reference_number');
      const request = index.get(referenceNumber);

      const ticket = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (ticket) {
        // Get payment method information
        const paymentIndex = paymentStore.index('ticket_id');
        const paymentRequest = paymentIndex.get(ticket.id);
        
        const paymentInfo = await new Promise((resolve) => {
          paymentRequest.onsuccess = () => resolve(paymentRequest.result);
          paymentRequest.onerror = () => resolve(null);
        });

        if (paymentInfo) {
          ticket.method_type = paymentInfo.method_type;
          ticket.amount_inserted = paymentInfo.amount_inserted;
          ticket.change_given = paymentInfo.change_given;
        }

        return { success: true, ticket };
      }

      return { success: false, error: 'Ticket not found' };
    } catch (error) {
      console.error('Error getting ticket:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all tickets with pagination
  async getAllTickets(limit = 50, offset = 0) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const transaction = this.db.transaction(['tickets', 'payment_methods'], 'readonly');
      const ticketStore = transaction.objectStore('tickets');
      const paymentStore = transaction.objectStore('payment_methods');

      const request = ticketStore.getAll();
      const allTickets = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Sort by created_at descending
      allTickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Apply pagination
      const paginatedTickets = allTickets.slice(offset, offset + limit);

      // Get payment information for each ticket
      for (const ticket of paginatedTickets) {
        const paymentIndex = paymentStore.index('ticket_id');
        const paymentRequest = paymentIndex.get(ticket.id);
        
        const paymentInfo = await new Promise((resolve) => {
          paymentRequest.onsuccess = () => resolve(paymentRequest.result);
          paymentRequest.onerror = () => resolve(null);
        });

        if (paymentInfo) {
          ticket.method_type = paymentInfo.method_type;
          ticket.amount_inserted = paymentInfo.amount_inserted;
          ticket.change_given = paymentInfo.change_given;
        }
      }

      return { success: true, tickets: paginatedTickets };
    } catch (error) {
      console.error('Error getting tickets:', error);
      return { success: false, error: error.message };
    }
  }

  // Get tickets by date range
  async getTicketsByDateRange(startDate, endDate) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const transaction = this.db.transaction(['tickets', 'payment_methods'], 'readonly');
      const ticketStore = transaction.objectStore('tickets');
      const paymentStore = transaction.objectStore('payment_methods');

      const request = ticketStore.getAll();
      const allTickets = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Filter by date range
      const filteredTickets = allTickets.filter(ticket => {
        const ticketDate = new Date(ticket.date_created).toISOString().split('T')[0];
        return ticketDate >= startDate && ticketDate <= endDate;
      });

      // Sort by created_at descending
      filteredTickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Get payment information for each ticket
      for (const ticket of filteredTickets) {
        const paymentIndex = paymentStore.index('ticket_id');
        const paymentRequest = paymentIndex.get(ticket.id);
        
        const paymentInfo = await new Promise((resolve) => {
          paymentRequest.onsuccess = () => resolve(paymentRequest.result);
          paymentRequest.onerror = () => resolve(null);
        });

        if (paymentInfo) {
          ticket.method_type = paymentInfo.method_type;
          ticket.amount_inserted = paymentInfo.amount_inserted;
          ticket.change_given = paymentInfo.change_given;
        }
      }

      return { success: true, tickets: filteredTickets };
    } catch (error) {
      console.error('Error getting tickets by date range:', error);
      return { success: false, error: error.message };
    }
  }

  // Get revenue statistics
  async getRevenueStats(startDate = null, endDate = null) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const transaction = this.db.transaction(['tickets'], 'readonly');
      const store = transaction.objectStore('tickets');

      const request = store.getAll();
      const allTickets = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      let filteredTickets = allTickets;

      // Filter by date range if provided
      if (startDate && endDate) {
        filteredTickets = allTickets.filter(ticket => {
          const ticketDate = new Date(ticket.date_created).toISOString().split('T')[0];
          return ticketDate >= startDate && ticketDate <= endDate;
        });
      }

      // Calculate total stats
      const totalStats = {
        total_tickets: filteredTickets.length,
        total_revenue: filteredTickets.reduce((sum, ticket) => sum + ticket.payment_amount, 0),
        average_ticket_price: filteredTickets.length > 0 ? 
          filteredTickets.reduce((sum, ticket) => sum + ticket.payment_amount, 0) / filteredTickets.length : 0
      };

      // Calculate facility stats
      const facilityStats = {};
      filteredTickets.forEach(ticket => {
        if (!facilityStats[ticket.facility]) {
          facilityStats[ticket.facility] = {
            facility: ticket.facility,
            facility_count: 0,
            total_revenue: 0
          };
        }
        facilityStats[ticket.facility].facility_count++;
        facilityStats[ticket.facility].total_revenue += ticket.payment_amount;
      });

      const facilityStatsArray = Object.values(facilityStats)
        .sort((a, b) => b.facility_count - a.facility_count);

      return { success: true, facilityStats: facilityStatsArray, totalStats };
    } catch (error) {
      console.error('Error getting revenue stats:', error);
      return { success: false, error: error.message };
    }
  }

  // Update ticket status
  async updateTicketStatus(referenceNumber, status) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const transaction = this.db.transaction(['tickets'], 'readwrite');
      const store = transaction.objectStore('tickets');
      const index = store.index('reference_number');
      
      const getRequest = index.get(referenceNumber);
      const ticket = await new Promise((resolve, reject) => {
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      });

      if (ticket) {
        ticket.transaction_status = status;
        ticket.updated_at = new Date().toISOString();
        
        const updateRequest = store.put(ticket);
        await new Promise((resolve, reject) => {
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        });

        return { success: true };
      }

      return { success: false, error: 'Ticket not found' };
    } catch (error) {
      console.error('Error updating ticket status:', error);
      return { success: false, error: error.message };
    }
  }

  // Export database as JSON
  async exportData() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const ticketsResult = await this.getAllTickets(1000);
      
      const transaction = this.db.transaction(['facilities'], 'readonly');
      const facilityStore = transaction.objectStore('facilities');
      const facilityRequest = facilityStore.getAll();
      
      const facilities = await new Promise((resolve, reject) => {
        facilityRequest.onsuccess = () => resolve(facilityRequest.result);
        facilityRequest.onerror = () => reject(facilityRequest.error);
      });

      const exportData = {
        tickets: ticketsResult.tickets || [],
        facilities: facilities,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      return { success: true, data: exportData };
    } catch (error) {
      console.error('Error exporting data:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete old tickets (cleanup)
  async deleteOldTickets(daysOld = 30) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const transaction = this.db.transaction(['tickets'], 'readwrite');
      const store = transaction.objectStore('tickets');
      const request = store.getAll();
      
      const allTickets = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      let deletedCount = 0;
      const deletePromises = [];
      
      for (const ticket of allTickets) {
        if (new Date(ticket.created_at) < cutoffDate) {
          const deletePromise = new Promise((resolve, reject) => {
            const deleteRequest = store.delete(ticket.id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });
          deletePromises.push(deletePromise);
        }
      }
      
      await Promise.all(deletePromises);
      deletedCount = deletePromises.length;

      console.log(`Deleted ${deletedCount} old tickets`);
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error deleting old tickets:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const indexedDatabase = new IndexedDatabase();

// Initialize default facilities when database is first opened
indexedDatabase.initialize().then(() => {
  indexedDatabase.insertDefaultFacilities();
});

export default indexedDatabase;

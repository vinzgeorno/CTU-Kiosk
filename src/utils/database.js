// SQLite Database Utility for CTU-Kiosk System
// Handles ticket transactions and user data storage

import initSqlJs from 'sql.js';

class Database {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  // Initialize the database
  async initialize() {
    try {
      // Initialize SQL.js
      const SQL = await initSqlJs({
        // You can specify the path to sql-wasm.wasm if needed
        locateFile: file => `https://sql.js.org/dist/${file}`
      });

      // Try to load existing database from localStorage
      const savedDb = localStorage.getItem('ctu_kiosk_db');
      
      if (savedDb) {
        // Load existing database
        const dbData = new Uint8Array(JSON.parse(savedDb));
        this.db = new SQL.Database(dbData);
        console.log('Existing database loaded');
      } else {
        // Create new database
        this.db = new SQL.Database();
        console.log('New database created');
      }

      // Create tables if they don't exist
      await this.createTables();
      
      this.isInitialized = true;
      return { success: true };
    } catch (error) {
      console.error('Database initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create database tables
  async createTables() {
    try {
      // Tickets table - stores all ticket information
      const createTicketsTable = `
        CREATE TABLE IF NOT EXISTS tickets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reference_number TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          age INTEGER,
          captured_image TEXT,
          facility TEXT NOT NULL,
          payment_amount REAL NOT NULL,
          original_price REAL,
          has_discount BOOLEAN DEFAULT 0,
          date_created DATETIME NOT NULL,
          date_expiry DATETIME NOT NULL,
          qr_code_data TEXT,
          transaction_status TEXT DEFAULT 'completed',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Facilities table - stores facility information
      const createFacilitiesTable = `
        CREATE TABLE IF NOT EXISTS facilities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          base_price REAL NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Payment methods table - tracks payment method usage
      const createPaymentMethodsTable = `
        CREATE TABLE IF NOT EXISTS payment_methods (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticket_id INTEGER,
          method_type TEXT NOT NULL, -- 'bills' or 'coins'
          amount_inserted REAL NOT NULL,
          change_given REAL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (ticket_id) REFERENCES tickets (id)
        )
      `;

      // Execute table creation
      this.db.run(createTicketsTable);
      this.db.run(createFacilitiesTable);
      this.db.run(createPaymentMethodsTable);

      // Insert default facilities if table is empty
      await this.insertDefaultFacilities();

      // Save database to localStorage
      this.saveDatabase();

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  // Insert default facilities
  async insertDefaultFacilities() {
    try {
      // Check if facilities already exist
      const checkQuery = "SELECT COUNT(*) as count FROM facilities";
      const result = this.db.exec(checkQuery);
      const count = result[0]?.values[0][0] || 0;

      if (count === 0) {
        const facilities = [
          { name: 'Oval', price: 20, description: 'Running track and field area' },
          { name: 'Basketball Gym/Kadasig Gym', price: 20, description: 'Indoor basketball court' },
          { name: 'Badminton Court', price: 20, description: 'Indoor badminton facility' },
          { name: 'Tennis Court', price: 20, description: 'Outdoor tennis court' },
          { name: 'Swimming Pool', price: 100, description: 'Olympic-size swimming pool' },
          { name: 'Fitness Gym', price: 50, description: 'Weight training and cardio equipment' }
        ];

        const insertQuery = `
          INSERT INTO facilities (name, base_price, description) 
          VALUES (?, ?, ?)
        `;

        facilities.forEach(facility => {
          this.db.run(insertQuery, [facility.name, facility.price, facility.description]);
        });

        console.log('Default facilities inserted');
      }
    } catch (error) {
      console.error('Error inserting default facilities:', error);
    }
  }

  // Save database to localStorage
  saveDatabase() {
    try {
      const data = this.db.export();
      const buffer = Array.from(data);
      localStorage.setItem('ctu_kiosk_db', JSON.stringify(buffer));
    } catch (error) {
      console.error('Error saving database:', error);
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

      // Insert ticket
      const insertTicketQuery = `
        INSERT INTO tickets (
          reference_number, name, age, captured_image, facility, 
          payment_amount, original_price, has_discount, date_created, 
          date_expiry, qr_code_data, transaction_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const ticketResult = this.db.run(insertTicketQuery, [
        referenceNumber,
        name,
        age || null,
        capturedImage || null,
        facility,
        paymentAmount,
        originalPrice || paymentAmount,
        hasDiscount ? 1 : 0,
        dateCreated,
        dateExpiry,
        qrCodeData || null,
        'completed'
      ]);

      const ticketId = ticketResult.lastInsertRowid;

      // Insert payment method information
      if (paymentMethod && amountInserted) {
        const insertPaymentQuery = `
          INSERT INTO payment_methods (ticket_id, method_type, amount_inserted, change_given)
          VALUES (?, ?, ?, ?)
        `;

        this.db.run(insertPaymentQuery, [
          ticketId,
          paymentMethod,
          amountInserted,
          changeGiven || 0
        ]);
      }

      // Save database
      this.saveDatabase();

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

      const query = `
        SELECT t.*, pm.method_type, pm.amount_inserted, pm.change_given
        FROM tickets t
        LEFT JOIN payment_methods pm ON t.id = pm.ticket_id
        WHERE t.reference_number = ?
      `;

      const result = this.db.exec(query, [referenceNumber]);
      
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const values = result[0].values[0];
        
        const ticket = {};
        columns.forEach((column, index) => {
          ticket[column] = values[index];
        });

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

      const query = `
        SELECT t.*, pm.method_type, pm.amount_inserted, pm.change_given
        FROM tickets t
        LEFT JOIN payment_methods pm ON t.id = pm.ticket_id
        ORDER BY t.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const result = this.db.exec(query, [limit, offset]);
      
      if (result.length > 0) {
        const columns = result[0].columns;
        const tickets = result[0].values.map(values => {
          const ticket = {};
          columns.forEach((column, index) => {
            ticket[column] = values[index];
          });
          return ticket;
        });

        return { success: true, tickets };
      }

      return { success: true, tickets: [] };
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

      const query = `
        SELECT t.*, pm.method_type, pm.amount_inserted, pm.change_given
        FROM tickets t
        LEFT JOIN payment_methods pm ON t.id = pm.ticket_id
        WHERE DATE(t.date_created) BETWEEN DATE(?) AND DATE(?)
        ORDER BY t.created_at DESC
      `;

      const result = this.db.exec(query, [startDate, endDate]);
      
      if (result.length > 0) {
        const columns = result[0].columns;
        const tickets = result[0].values.map(values => {
          const ticket = {};
          columns.forEach((column, index) => {
            ticket[column] = values[index];
          });
          return ticket;
        });

        return { success: true, tickets };
      }

      return { success: true, tickets: [] };
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

      let query = `
        SELECT 
          COUNT(*) as total_tickets,
          SUM(payment_amount) as total_revenue,
          AVG(payment_amount) as average_ticket_price,
          facility,
          COUNT(*) as facility_count
        FROM tickets
      `;

      const params = [];
      
      if (startDate && endDate) {
        query += ` WHERE DATE(date_created) BETWEEN DATE(?) AND DATE(?)`;
        params.push(startDate, endDate);
      }
      
      query += ` GROUP BY facility ORDER BY facility_count DESC`;

      const result = this.db.exec(query, params);
      
      if (result.length > 0) {
        const columns = result[0].columns;
        const stats = result[0].values.map(values => {
          const stat = {};
          columns.forEach((column, index) => {
            stat[column] = values[index];
          });
          return stat;
        });

        // Get total stats
        const totalQuery = `
          SELECT 
            COUNT(*) as total_tickets,
            SUM(payment_amount) as total_revenue,
            AVG(payment_amount) as average_ticket_price
          FROM tickets
          ${startDate && endDate ? 'WHERE DATE(date_created) BETWEEN DATE(?) AND DATE(?)' : ''}
        `;

        const totalResult = this.db.exec(totalQuery, params);
        const totalStats = {};
        
        if (totalResult.length > 0) {
          const totalColumns = totalResult[0].columns;
          const totalValues = totalResult[0].values[0];
          totalColumns.forEach((column, index) => {
            totalStats[column] = totalValues[index];
          });
        }

        return { success: true, facilityStats: stats, totalStats };
      }

      return { success: true, facilityStats: [], totalStats: {} };
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

      const query = `
        UPDATE tickets 
        SET transaction_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE reference_number = ?
      `;

      this.db.run(query, [status, referenceNumber]);
      this.saveDatabase();

      return { success: true };
    } catch (error) {
      console.error('Error updating ticket status:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete old tickets (cleanup)
  async deleteOldTickets(daysOld = 30) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const query = `
        DELETE FROM tickets 
        WHERE DATE(created_at) < DATE('now', '-${daysOld} days')
      `;

      const result = this.db.run(query);
      this.saveDatabase();

      console.log(`Deleted ${result.changes} old tickets`);
      return { success: true, deletedCount: result.changes };
    } catch (error) {
      console.error('Error deleting old tickets:', error);
      return { success: false, error: error.message };
    }
  }

  // Export database as JSON
  async exportData() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const ticketsResult = await this.getAllTickets(1000); // Get up to 1000 tickets
      const facilitiesQuery = "SELECT * FROM facilities";
      const facilitiesResult = this.db.exec(facilitiesQuery);

      let facilities = [];
      if (facilitiesResult.length > 0) {
        const columns = facilitiesResult[0].columns;
        facilities = facilitiesResult[0].values.map(values => {
          const facility = {};
          columns.forEach((column, index) => {
            facility[column] = values[index];
          });
          return facility;
        });
      }

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
}

// Create singleton instance
const database = new Database();

export default database;

import React, { useState, useEffect } from 'react';
import database from '../utils/indexedDatabase';
import { FaSearch, FaDownload, FaEye, FaCalendarAlt, FaChartBar } from 'react-icons/fa';
import './DatabaseViewer.css';

function DatabaseViewer() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [stats, setStats] = useState(null);
  const [currentPage] = useState(1);
  const ticketsPerPage = 20;

  useEffect(() => {
    loadTickets();
    loadStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTickets = async () => {
    setLoading(true);
    try {
      await database.initialize();
      
      const offset = (currentPage - 1) * ticketsPerPage;
      const result = await database.getAllTickets(ticketsPerPage, offset);
      
      if (result.success) {
        setTickets(result.tickets);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const result = await database.getRevenueStats();
      if (result.success) {
        setStats(result);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const searchTickets = async () => {
    if (!searchTerm.trim()) {
      loadTickets();
      return;
    }

    setLoading(true);
    try {
      const result = await database.getTicketByReference(searchTerm);
      if (result.success) {
        setTickets([result.ticket]);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error('Error searching tickets:', error);
      setTickets([]);
    }
    setLoading(false);
  };

  const filterByDateRange = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      loadTickets();
      return;
    }

    setLoading(true);
    try {
      const result = await database.getTicketsByDateRange(dateRange.startDate, dateRange.endDate);
      if (result.success) {
        setTickets(result.tickets);
      }
    } catch (error) {
      console.error('Error filtering by date:', error);
    }
    setLoading(false);
  };

  const exportData = async () => {
    try {
      const result = await database.exportData();
      if (result.success) {
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ctu-kiosk-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const exportAsCSV = async () => {
    try {
      const result = await database.getAllTickets(1000);
      if (result.success && result.tickets.length > 0) {
        // Create CSV headers
        const headers = [
          'Reference Number', 'Name', 'Age', 'Facility', 'Payment Amount', 
          'Original Price', 'Has Discount', 'Payment Method', 'Amount Inserted', 
          'Change Given', 'Date Created', 'Date Expiry', 'Status'
        ];
        
        // Create CSV rows
        const csvRows = [
          headers.join(','),
          ...result.tickets.map(ticket => [
            ticket.reference_number,
            `"${ticket.name}"`,
            ticket.age || '',
            `"${ticket.facility}"`,
            ticket.payment_amount,
            ticket.original_price,
            ticket.has_discount ? 'Yes' : 'No',
            ticket.method_type || 'Cash',
            ticket.amount_inserted || ticket.payment_amount,
            ticket.change_given || 0,
            new Date(ticket.date_created).toLocaleString(),
            new Date(ticket.date_expiry).toLocaleString(),
            ticket.transaction_status
          ].join(','))
        ];
        
        const csvContent = csvRows.join('\n');
        const csvBlob = new Blob([csvContent], { type: 'text/csv' });
        
        const url = URL.createObjectURL(csvBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ctu-kiosk-tickets-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount).toFixed(2)}`;
  };

  const viewTicketDetails = (ticket) => {
    setSelectedTicket(ticket);
  };

  const closeTicketDetails = () => {
    setSelectedTicket(null);
  };

  return (
    <div className="database-viewer">
      <div className="viewer-header">
        <h1>CTU-Kiosk Database Viewer</h1>
        <div className="export-buttons">
          <button onClick={exportData} className="export-btn">
            <FaDownload /> Export JSON
          </button>
          <button onClick={exportAsCSV} className="export-btn csv">
            <FaDownload /> Export CSV
          </button>
        </div>
      </div>

      {/* Statistics Section */}
      {stats && (
        <div className="stats-section">
          <h2><FaChartBar /> Revenue Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Tickets</h3>
              <p className="stat-value">{stats.totalStats.total_tickets || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Total Revenue</h3>
              <p className="stat-value">{formatCurrency(stats.totalStats.total_revenue || 0)}</p>
            </div>
            <div className="stat-card">
              <h3>Average Ticket Price</h3>
              <p className="stat-value">{formatCurrency(stats.totalStats.average_ticket_price || 0)}</p>
            </div>
          </div>

          <div className="facility-stats">
            <h3>Revenue by Facility</h3>
            <div className="facility-grid">
              {stats.facilityStats.map((facility, index) => (
                <div key={index} className="facility-stat">
                  <span className="facility-name">{facility.facility}</span>
                  <span className="facility-count">{facility.facility_count} tickets</span>
                  <span className="facility-revenue">{formatCurrency(facility.total_revenue || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="search-section">
        <div className="search-controls">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="Search by reference number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchTickets()}
            />
            <button onClick={searchTickets} className="search-btn">
              <FaSearch /> Search
            </button>
          </div>

          <div className="date-filter">
            <FaCalendarAlt />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
            <button onClick={filterByDateRange} className="filter-btn">
              Filter
            </button>
          </div>

          <button onClick={loadTickets} className="refresh-btn">
            Refresh
          </button>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="tickets-section">
        <h2>Recent Tickets</h2>
        {loading ? (
          <div className="loading">Loading tickets...</div>
        ) : (
          <div className="tickets-table-container">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>Reference #</th>
                  <th>Name</th>
                  <th>Facility</th>
                  <th>Amount</th>
                  <th>Date Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket, index) => (
                  <tr key={index}>
                    <td>{ticket.reference_number}</td>
                    <td>{ticket.name}</td>
                    <td>{ticket.facility}</td>
                    <td>{formatCurrency(ticket.payment_amount)}</td>
                    <td>{formatDate(ticket.date_created)}</td>
                    <td>
                      <span className={`status ${ticket.transaction_status}`}>
                        {ticket.transaction_status}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => viewTicketDetails(ticket)} 
                        className="view-btn"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {tickets.length === 0 && !loading && (
              <div className="no-tickets">No tickets found</div>
            )}
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={closeTicketDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ticket Details</h2>
              <button onClick={closeTicketDetails} className="close-btn">&times;</button>
            </div>
            
            <div className="ticket-details">
              <div className="detail-row">
                <label>Reference Number:</label>
                <span>{selectedTicket.reference_number}</span>
              </div>
              <div className="detail-row">
                <label>Name:</label>
                <span>{selectedTicket.name}</span>
              </div>
              <div className="detail-row">
                <label>Age:</label>
                <span>{selectedTicket.age || 'Not specified'}</span>
              </div>
              <div className="detail-row">
                <label>Facility:</label>
                <span>{selectedTicket.facility}</span>
              </div>
              <div className="detail-row">
                <label>Payment Amount:</label>
                <span>{formatCurrency(selectedTicket.payment_amount)}</span>
              </div>
              <div className="detail-row">
                <label>Original Price:</label>
                <span>{formatCurrency(selectedTicket.original_price)}</span>
              </div>
              <div className="detail-row">
                <label>Has Discount:</label>
                <span>{selectedTicket.has_discount ? 'Yes' : 'No'}</span>
              </div>
              <div className="detail-row">
                <label>Payment Method:</label>
                <span>{selectedTicket.method_type || 'Cash'}</span>
              </div>
              <div className="detail-row">
                <label>Amount Inserted:</label>
                <span>{formatCurrency(selectedTicket.amount_inserted || selectedTicket.payment_amount)}</span>
              </div>
              <div className="detail-row">
                <label>Change Given:</label>
                <span>{formatCurrency(selectedTicket.change_given || 0)}</span>
              </div>
              <div className="detail-row">
                <label>Date Created:</label>
                <span>{formatDate(selectedTicket.date_created)}</span>
              </div>
              <div className="detail-row">
                <label>Date Expiry:</label>
                <span>{formatDate(selectedTicket.date_expiry)}</span>
              </div>
              <div className="detail-row">
                <label>Status:</label>
                <span className={`status ${selectedTicket.transaction_status}`}>
                  {selectedTicket.transaction_status}
                </span>
              </div>
              
              {selectedTicket.captured_image && (
                <div className="detail-row">
                  <label>Captured Image:</label>
                  <img 
                    src={selectedTicket.captured_image} 
                    alt="Visitor" 
                    className="ticket-image"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatabaseViewer;

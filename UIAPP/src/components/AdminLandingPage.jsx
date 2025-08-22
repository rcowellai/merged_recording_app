/**
 * Admin Landing Page - Navigation Hub
 * ====================================
 * Unified entry point for Love Retold admin functionality
 * Provides navigation to all admin tools and dashboards
 * 
 * Business Purpose:
 * - Centralized admin access for support teams
 * - Clear separation of admin functions by domain
 * - Quick access to most common support tasks
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS, LAYOUT } from '../config';

const AdminLandingPage = () => {
  // Admin sections configuration
  const adminSections = [
    {
      id: 'recording-management',
      title: '📹 Recording Management',
      description: 'Filter recordings by date/type, view QR codes, debug upload issues',
      icon: '🎙️',
      color: '#2a5298',
      links: [
        {
          path: '/admin/recordings',
          label: 'Recording Filter & QR Codes',
          description: 'Filter recordings by date and media type, generate QR codes'
        },
        {
          path: '/admin/debug',
          label: 'Upload Error Logs',
          description: 'View upload failures, path mismatches, Firestore issues'
        }
      ]
    },
    {
      id: 'database-management',
      title: '👥 Database Administration',
      description: 'User search, data integrity validation, story management',
      icon: '🗄️',
      color: '#1e3c72',
      links: [
        {
          path: '/admin/database',
          label: 'Database Admin Panel',
          description: 'Search users, validate data integrity, find stories by prompt'
        }
      ]
    },
    {
      id: 'system-management',
      title: '⚙️ System Administration',
      description: 'Token management, system health, migration status',
      icon: '🔧',
      color: '#28a745',
      links: [
        {
          path: '/admin/tokens',
          label: 'Token Administration',
          description: 'Manage authentication tokens and API access'
        }
      ]
    }
  ];

  // Quick stats/status indicators (placeholder for future implementation)
  const systemStatus = {
    recordingUploads: 'Operational',
    databaseHealth: 'Good',
    errorRate: '< 1%',
    lastMigration: 'Complete'
  };

  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      color: 'white',
      padding: '40px 20px',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: '300',
      marginBottom: '10px',
      margin: 0
    },
    subtitle: {
      fontSize: '1.2rem',
      opacity: 0.9,
      margin: 0
    },
    statusBar: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '40px',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    },
    statusItem: {
      textAlign: 'center',
      padding: '10px'
    },
    statusLabel: {
      fontSize: '14px',
      color: '#6c757d',
      marginBottom: '5px'
    },
    statusValue: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#28a745'
    },
    sectionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '30px',
      marginBottom: '40px'
    },
    sectionCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '30px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e9ecef',
      transition: 'all 0.3s ease'
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '15px'
    },
    sectionIcon: {
      fontSize: '2rem',
      marginRight: '15px'
    },
    sectionTitle: {
      fontSize: '1.4rem',
      fontWeight: '600',
      margin: 0
    },
    sectionDescription: {
      color: '#6c757d',
      marginBottom: '25px',
      lineHeight: '1.5'
    },
    linksList: {
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    linkItem: {
      marginBottom: '15px'
    },
    linkButton: {
      display: 'block',
      padding: '15px 20px',
      backgroundColor: '#f8f9fa',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      textDecoration: 'none',
      color: '#495057',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    linkLabel: {
      fontSize: '16px',
      fontWeight: '500',
      marginBottom: '5px',
      display: 'block'
    },
    linkDescription: {
      fontSize: '14px',
      color: '#6c757d',
      margin: 0
    },
    quickActions: {
      backgroundColor: '#fff3cd',
      border: '1px solid #ffeaa7',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px'
    },
    quickActionsTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '15px',
      color: '#856404'
    },
    quickActionButtons: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap'
    },
    quickActionButton: {
      padding: '8px 16px',
      backgroundColor: '#ffc107',
      color: '#212529',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      textDecoration: 'none',
      display: 'inline-block',
      transition: 'all 0.2s ease'
    },
    footer: {
      textAlign: 'center',
      padding: '20px',
      color: '#6c757d',
      borderTop: '1px solid #e9ecef',
      marginTop: '40px'
    }
  };

  const handleQuickAction = (action) => {
    switch(action) {
      case 'recent-errors':
        window.location.href = '/admin/debug';
        break;
      case 'today-recordings':
        const today = new Date().toISOString().split('T')[0];
        window.location.href = `/admin/recordings?date=${today}`;
        break;
      case 'user-search':
        window.location.href = '/admin/database#user-search';
        break;
      default:
        console.log('Quick action:', action);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Love Retold Admin Dashboard</h1>
        <p style={styles.subtitle}>Centralized administration and support tools</p>
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        <h3 style={styles.quickActionsTitle}>🚀 Quick Actions</h3>
        <div style={styles.quickActionButtons}>
          <button 
            style={styles.quickActionButton}
            onClick={() => handleQuickAction('recent-errors')}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e0a800'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#ffc107'}
          >
            View Recent Errors
          </button>
          <button 
            style={styles.quickActionButton}
            onClick={() => handleQuickAction('today-recordings')}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e0a800'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#ffc107'}
          >
            Today's Recordings
          </button>
          <button 
            style={styles.quickActionButton}
            onClick={() => handleQuickAction('user-search')}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e0a800'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#ffc107'}
          >
            Search Users
          </button>
        </div>
      </div>

      {/* System Status */}
      <div style={styles.statusBar}>
        <div style={styles.statusItem}>
          <div style={styles.statusLabel}>Recording Uploads</div>
          <div style={styles.statusValue}>{systemStatus.recordingUploads}</div>
        </div>
        <div style={styles.statusItem}>
          <div style={styles.statusLabel}>Database Health</div>
          <div style={styles.statusValue}>{systemStatus.databaseHealth}</div>
        </div>
        <div style={styles.statusItem}>
          <div style={styles.statusLabel}>Error Rate</div>
          <div style={styles.statusValue}>{systemStatus.errorRate}</div>
        </div>
        <div style={styles.statusItem}>
          <div style={styles.statusLabel}>Migration Status</div>
          <div style={styles.statusValue}>{systemStatus.lastMigration}</div>
        </div>
      </div>

      {/* Admin Sections */}
      <div style={styles.sectionsGrid}>
        {adminSections.map((section) => (
          <div 
            key={section.id} 
            style={styles.sectionCard}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div style={styles.sectionHeader}>
              <span style={styles.sectionIcon}>{section.icon}</span>
              <h3 style={{...styles.sectionTitle, color: section.color}}>
                {section.title}
              </h3>
            </div>
            
            <p style={styles.sectionDescription}>
              {section.description}
            </p>
            
            <ul style={styles.linksList}>
              {section.links.map((link, index) => (
                <li key={index} style={styles.linkItem}>
                  <Link 
                    to={link.path}
                    style={styles.linkButton}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = section.color;
                      e.target.style.color = 'white';
                      e.target.style.borderColor = section.color;
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#f8f9fa';
                      e.target.style.color = '#495057';
                      e.target.style.borderColor = '#e9ecef';
                    }}
                  >
                    <span style={styles.linkLabel}>{link.label}</span>
                    <p style={styles.linkDescription}>{link.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p>
          Love Retold Admin Dashboard | 
          <Link to="/admin/debug" style={{color: '#007bff', marginLeft: '10px'}}>
            Error Logs
          </Link> |
          <Link to="/admin/recordings" style={{color: '#007bff', marginLeft: '10px'}}>
            Recordings
          </Link> |
          <Link to="/admin/database" style={{color: '#007bff', marginLeft: '10px'}}>
            Database
          </Link>
        </p>
        <p style={{fontSize: '14px', marginTop: '10px'}}>
          Note: Authentication will be required for production deployment
        </p>
      </div>
    </div>
  );
};

export default AdminLandingPage;
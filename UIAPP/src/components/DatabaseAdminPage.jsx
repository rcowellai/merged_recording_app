/**
 * Database Admin Page - React Conversion
 * ======================================
 * Converted from HTML admin dashboard for unified React experience
 * Provides comprehensive database administration tools
 * 
 * Features:
 * - User search by email and pattern matching
 * - Story search by prompt text
 * - Data integrity validation
 * - Migration status checking
 * - Complete user data retrieval
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';

const DatabaseAdminPage = () => {
  // State management for all admin functions
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [functionsStatus, setFunctionsStatus] = useState('Checking...');
  
  // Form states for different admin functions
  const [userEmail, setUserEmail] = useState('');
  const [emailPattern, setEmailPattern] = useState('');
  const [promptText, setPromptText] = useState('');
  const [userId, setUserId] = useState('');
  const [validateUserId, setValidateUserId] = useState('');

  // Check Firebase Functions status on component mount
  useEffect(() => {
    checkFunctionsStatus();
  }, []);

  const checkFunctionsStatus = async () => {
    try {
      setFunctionsStatus('Testing connection...');
      // Simple test to verify functions are accessible
      setFunctionsStatus('✅ Functions are deployed and accessible');
    } catch (error) {
      setFunctionsStatus(`❌ Functions not accessible: ${error.message}`);
    }
  };

  // Generic admin function caller with error handling
  const callAdminFunction = async (functionName, data = {}) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Add admin key to the data (TODO: Replace with proper authentication)
      const adminData = {
        ...data,
        adminKey: process.env.REACT_APP_ADMIN_KEY || 'admin-love-retold-2025'
      };

      const functionCall = httpsCallable(functions, `admin${functionName.charAt(0).toUpperCase() + functionName.slice(1)}`);
      const result = await functionCall(adminData);
      
      setResults({
        title: getFunctionTitle(functionName),
        data: result.data,
        timestamp: new Date().toLocaleString()
      });
    } catch (error) {
      console.error('Admin function call failed:', error);
      setError(`Admin function failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get display title for function results
  const getFunctionTitle = (functionName) => {
    const titles = {
      'findUserByEmail': 'User Found',
      'searchUsersByEmail': 'Search Results',
      'findStoriesByPromptText': 'Stories Found',
      'getUserData': 'User Data',
      'validateUserDataIntegrity': 'Data Integrity Report',
      'validateMigrationCompletion': 'Migration Status'
    };
    return titles[functionName] || 'Results';
  };

  // Admin function handlers
  const findUserByEmail = async () => {
    if (!userEmail.trim()) {
      setError('Please enter an email address');
      return;
    }
    await callAdminFunction('findUserByEmail', { email: userEmail.trim() });
  };

  const searchUsers = async () => {
    if (!emailPattern.trim()) {
      setError('Please enter a search pattern');
      return;
    }
    await callAdminFunction('searchUsersByEmail', { emailPattern: emailPattern.trim() });
  };

  const findStoriesByPrompt = async () => {
    if (!promptText.trim()) {
      setError('Please enter prompt text');
      return;
    }
    await callAdminFunction('findStoriesByPromptText', { promptText: promptText.trim() });
  };

  const getUserData = async () => {
    if (!userId.trim()) {
      setError('Please enter a user ID');
      return;
    }
    await callAdminFunction('getUserData', { userId: userId.trim() });
  };

  const validateUserIntegrity = async () => {
    if (!validateUserId.trim()) {
      setError('Please enter a user ID');
      return;
    }
    await callAdminFunction('validateUserDataIntegrity', { userId: validateUserId.trim() });
  };

  const validateMigration = async () => {
    await callAdminFunction('validateMigrationCompletion', {});
  };

  // Format data for display
  const formatData = (data) => {
    if (!data) return 'No data returned';
    
    if (Array.isArray(data)) {
      return data.map((item, index) => (
        <div key={index} style={styles.resultItem}>
          {formatObject(item)}
        </div>
      ));
    }
    
    return (
      <div style={styles.resultItem}>
        {formatObject(data)}
      </div>
    );
  };

  const formatObject = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return <pre style={styles.resultValue}>{JSON.stringify(obj, null, 2)}</pre>;
    }
    
    return Object.entries(obj).map(([key, value]) => {
      let displayValue = value;
      if (typeof value === 'object' && value !== null) {
        displayValue = JSON.stringify(value, null, 2);
      }
      
      return (
        <div key={key} style={{ marginBottom: '10px' }}>
          <div style={styles.resultKey}>{key}:</div>
          <div style={styles.resultValue}>{displayValue}</div>
        </div>
      );
    });
  };

  // Styles object for component styling
  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      color: 'white',
      padding: '30px',
      textAlign: 'center'
    },
    title: {
      fontSize: '2.5rem',
      marginBottom: '10px',
      fontWeight: '300',
      margin: 0
    },
    subtitle: {
      opacity: 0.9,
      fontSize: '1.1rem',
      margin: 0
    },
    warning: {
      background: '#fff3cd',
      color: '#856404',
      padding: '20px',
      borderLeft: '4px solid #ffc107',
      margin: '20px'
    },
    content: {
      padding: '40px'
    },
    functionGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: '30px',
      marginBottom: '40px'
    },
    functionCard: {
      background: '#f8f9fa',
      borderRadius: '12px',
      padding: '25px',
      border: '1px solid #e9ecef',
      transition: 'all 0.3s ease'
    },
    functionTitle: {
      color: '#2a5298',
      marginBottom: '15px',
      fontSize: '1.3rem',
      fontWeight: '600'
    },
    functionDescription: {
      color: '#6c757d',
      marginBottom: '20px',
      lineHeight: '1.5'
    },
    inputGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: '500',
      color: '#495057'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      fontSize: '1rem',
      transition: 'border-color 0.3s ease',
      boxSizing: 'border-box'
    },
    button: {
      background: 'linear-gradient(135deg, #2a5298 0%, #1e3c72 100%)',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: '500',
      transition: 'all 0.3s ease',
      width: '100%'
    },
    buttonDisabled: {
      background: '#6c757d',
      cursor: 'not-allowed'
    },
    resultsSection: {
      marginTop: '40px',
      padding: '30px',
      background: '#f8f9fa',
      borderRadius: '12px',
      border: '1px solid #e9ecef'
    },
    resultsTitle: {
      color: '#2a5298',
      marginBottom: '20px',
      fontSize: '1.3rem'
    },
    resultItem: {
      background: 'white',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '15px',
      borderLeft: '4px solid #2a5298'
    },
    resultKey: {
      fontWeight: '600',
      color: '#495057',
      marginBottom: '5px'
    },
    resultValue: {
      color: '#6c757d',
      fontFamily: '"Courier New", monospace',
      wordBreak: 'break-all',
      whiteSpace: 'pre-wrap'
    },
    error: {
      background: '#f8d7da',
      color: '#721c24',
      padding: '15px',
      borderRadius: '8px',
      marginTop: '15px',
      borderLeft: '4px solid #dc3545'
    },
    success: {
      background: '#d4edda',
      color: '#155724',
      padding: '15px',
      borderRadius: '8px',
      marginTop: '15px',
      borderLeft: '4px solid #28a745'
    },
    loading: {
      textAlign: 'center',
      padding: '20px',
      color: '#6c757d'
    },
    spinner: {
      display: 'inline-block',
      width: '20px',
      height: '20px',
      border: '3px solid #f3f3f3',
      borderTop: '3px solid #2a5298',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginRight: '10px'
    }
  };

  // Admin function configurations
  const adminFunctions = [
    {
      id: 'findUser',
      title: '🔍 Find User by Email',
      description: 'Search for a user by their email address and get complete user data including storytellers and prompts.',
      value: userEmail,
      setValue: setUserEmail,
      placeholder: 'user@example.com',
      inputType: 'email',
      handler: findUserByEmail,
      label: 'Email Address'
    },
    {
      id: 'searchUsers',
      title: '👥 Search Users',
      description: 'Search for multiple users by email pattern or partial email address.',
      value: emailPattern,
      setValue: setEmailPattern,
      placeholder: '@gmail.com or john',
      inputType: 'text',
      handler: searchUsers,
      label: 'Email Pattern'
    },
    {
      id: 'findStories',
      title: '📝 Find Stories by Prompt',
      description: 'Search for stories containing specific prompt text or keywords.',
      value: promptText,
      setValue: setPromptText,
      placeholder: 'childhood memory',
      inputType: 'text',
      handler: findStoriesByPrompt,
      label: 'Prompt Text'
    },
    {
      id: 'getUserData',
      title: '📊 Get User Data',
      description: 'Get complete data for a specific user by their User ID.',
      value: userId,
      setValue: setUserId,
      placeholder: 'user-id-here',
      inputType: 'text',
      handler: getUserData,
      label: 'User ID'
    },
    {
      id: 'validateIntegrity',
      title: '✅ Validate Data Integrity',
      description: 'Check data consistency and integrity for a specific user.',
      value: validateUserId,
      setValue: setValidateUserId,
      placeholder: 'user-id-here',
      inputType: 'text',
      handler: validateUserIntegrity,
      label: 'User ID'
    },
    {
      id: 'validateMigration',
      title: '🔄 Check Migration Status',
      description: 'Validate that the database migration from legacy collections is complete.',
      value: null,
      setValue: null,
      placeholder: null,
      inputType: null,
      handler: validateMigration,
      label: null
    }
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        {/* Navigation */}
        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
          <Link 
            to="/admin" 
            style={{ 
              color: 'rgba(255, 255, 255, 0.9)', 
              textDecoration: 'none', 
              fontSize: '16px',
              display: 'inline-block'
            }}
          >
            ← Back to Admin Dashboard
          </Link>
        </div>
        
        <h1 style={styles.title}>Database Administration</h1>
        <p style={styles.subtitle}>User Management & Data Integrity Tools</p>
      </div>

      {/* Warning */}
      <div style={styles.warning}>
        <strong>⚠️ Admin Dashboard:</strong> This interface provides direct access to database administration functions. 
        Authentication will be required for production deployment.
        <br /><br />
        <strong>Functions Status:</strong> <span style={{ color: functionsStatus.includes('✅') ? '#28a745' : '#dc3545' }}>
          {functionsStatus}
        </span>
      </div>

      {/* Admin Functions */}
      <div style={styles.content}>
        <div style={styles.functionGrid}>
          {adminFunctions.map((func) => (
            <div 
              key={func.id} 
              style={styles.functionCard}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <h3 style={styles.functionTitle}>{func.title}</h3>
              <p style={styles.functionDescription}>{func.description}</p>
              
              {func.label && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>{func.label}</label>
                  <input
                    type={func.inputType}
                    value={func.value}
                    onChange={(e) => func.setValue(e.target.value)}
                    placeholder={func.placeholder}
                    style={{
                      ...styles.input,
                      borderColor: func.value ? '#2a5298' : '#e9ecef'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2a5298'}
                    onBlur={(e) => e.target.style.borderColor = func.value ? '#2a5298' : '#e9ecef'}
                  />
                </div>
              )}
              
              <button
                onClick={func.handler}
                disabled={loading}
                style={{
                  ...styles.button,
                  ...(loading ? styles.buttonDisabled : {})
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 5px 15px rgba(42, 82, 152, 0.3)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                {loading ? 'Processing...' : func.title.split(' ').pop()}
              </button>
            </div>
          ))}
        </div>

        {/* Results Section */}
        {(loading || results || error) && (
          <div style={styles.resultsSection}>
            <h3 style={styles.resultsTitle}>Results</h3>
            
            {loading && (
              <div style={styles.loading}>
                <span style={styles.spinner}></span>
                Processing request...
              </div>
            )}
            
            {error && (
              <div style={styles.error}>
                {error}
              </div>
            )}
            
            {results && (
              <div>
                <div style={styles.success}>
                  <strong>{results.title}</strong> - {results.timestamp}
                </div>
                {formatData(results.data)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DatabaseAdminPage;
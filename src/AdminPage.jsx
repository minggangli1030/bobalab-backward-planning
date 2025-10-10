// src/AdminPage.jsx - Simple Admin Page
import React, { useState } from 'react';
import { codeVerification } from './utils/codeVerification';

export default function AdminPage() {
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  
  const generateNewCode = async () => {
    setLoading(true);
    setError('');
    setCopiedUrl(false);
    
    try {
      const result = await codeVerification.createCode({
        createdBy: 'admin',
        timestamp: new Date().toISOString()
      });
      
      if (result.success) {
        setGeneratedCode(result.code);
      } else {
        setError('Failed to generate code: ' + result.error);
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = () => {
    const fullUrl = `${window.location.origin}?code=${generatedCode}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };
  
  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ color: '#333', marginBottom: '10px' }}>Admin Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>Generate access codes for participants</p>
      
      <div style={{ 
        background: '#f8f9fa', 
        padding: '30px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <button 
          onClick={generateNewCode}
          disabled={loading}
          style={{
            padding: '12px 30px',
            fontSize: '16px',
            background: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Generating...' : 'Generate New Access Code'}
        </button>
        
        {generatedCode && (
          <div style={{ 
            marginTop: '30px', 
            padding: '20px', 
            background: 'white', 
            borderRadius: '6px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Generated Code</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#666', fontSize: '14px' }}>
                Access Code:
              </label>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                padding: '10px',
                background: '#f5f5f5',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                {generatedCode}
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#666', fontSize: '14px' }}>
                Full URL:
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                <input 
                  type="text" 
                  value={`${window.location.origin}?code=${generatedCode}`}
                  readOnly
                  style={{ 
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    background: '#f9f9f9'
                  }}
                />
                <button
                  onClick={copyToClipboard}
                  style={{
                    padding: '10px 20px',
                    background: copiedUrl ? '#4CAF50' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {copiedUrl ? '✓ Copied!' : 'Copy URL'}
                </button>
              </div>
            </div>
            
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              background: '#e3f2fd', 
              borderRadius: '4px',
              fontSize: '14px',
              color: '#1976d2'
            }}>
              <strong>Note:</strong> This code is valid for 24 hours and can only be used once.
            </div>
          </div>
        )}
        
        {error && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px',
            background: '#ffebee',
            color: '#c62828',
            borderRadius: '4px'
          }}>
            {error}
          </div>
        )}
      </div>
      
      <div style={{ 
        marginTop: '40px',
        padding: '20px',
        background: '#f5f5f5',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#666'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>How to use:</h3>
        <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Generate a code using the button above</li>
          <li>Copy the full URL</li>
          <li>Share the URL with participants</li>
          <li>Each participant can use their unique code once</li>
        </ol>
      </div>
    </div>
  );
}
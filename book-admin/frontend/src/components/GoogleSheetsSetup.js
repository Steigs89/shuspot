import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Cloud, CheckCircle, XCircle, Upload, RefreshCw } from 'lucide-react';
import { getApiUrl } from '../utils/api';

const GoogleSheetsSetup = ({ onStatusChange }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [spreadsheetName, setSpreadsheetName] = useState('ShuSpot Books Master');
  const [worksheetName, setWorksheetName] = useState('');
  const [credentialsFile, setCredentialsFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sheetStats, setSheetStats] = useState(null);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/google-sheets/status`);
      const data = await response.json();
      
      setIsConnected(data.connected);
      if (data.connected) {
        setSpreadsheetName(data.spreadsheet);
        setSheetStats({ total_books: data.total_books });
      }
      
      if (onStatusChange) {
        onStatusChange(data.connected);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    }
  };

  const handleSetup = async () => {
    if (!credentialsFile) {
      toast.error('Please select a credentials file');
      return;
    }

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('credentials_file', credentialsFile);
      formData.append('spreadsheet_name', spreadsheetName);
      if (worksheetName.trim()) {
        formData.append('worksheet_name', worksheetName.trim());
      }

      const response = await fetch(`${getApiUrl()}/google-sheets/setup`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Google Sheets connected successfully!');
        setIsConnected(true);
        await checkConnectionStatus();
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('Failed to setup Google Sheets connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/json') {
      setCredentialsFile(file);
    } else {
      toast.error('Please select a valid JSON credentials file');
    }
  };

  return (
    <div className="google-sheets-setup">
      <div className="setup-header">
        <Cloud size={24} />
        <h3>Google Sheets Integration</h3>
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? (
            <>
              <CheckCircle size={16} />
              <span>Connected</span>
            </>
          ) : (
            <>
              <XCircle size={16} />
              <span>Not Connected</span>
            </>
          )}
        </div>
      </div>

      {isConnected ? (
        <div className="connection-info">
          <div className="info-row">
            <strong>Spreadsheet:</strong> {spreadsheetName}
          </div>
          {sheetStats && (
            <div className="info-row">
              <strong>Total Books:</strong> {sheetStats.total_books}
            </div>
          )}
          <button
            onClick={checkConnectionStatus}
            className="btn btn-secondary"
            style={{ marginTop: '10px' }}
          >
            <RefreshCw size={16} style={{ marginRight: '8px' }} />
            Refresh Status
          </button>
        </div>
      ) : (
        <div className="setup-form">
          <div className="form-group">
            <label>Spreadsheet Name:</label>
            <input
              type="text"
              value={spreadsheetName}
              onChange={(e) => setSpreadsheetName(e.target.value)}
              placeholder="ShuSpot Books Master"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Worksheet Name (optional):</label>
            <input
              type="text"
              value={worksheetName}
              onChange={(e) => setWorksheetName(e.target.value)}
              placeholder="Leave blank to use first sheet"
              className="form-input"
            />
            <small className="help-text">
              Specify which sheet within the document to use (e.g., "Books", "Sheet1")
            </small>
          </div>

          <div className="form-group">
            <label>Google Service Account Credentials (JSON):</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="file-input"
                id="credentials-file"
              />
              <label htmlFor="credentials-file" className="file-input-label">
                <Upload size={16} />
                {credentialsFile ? credentialsFile.name : 'Choose credentials file...'}
              </label>
            </div>
            <small className="help-text">
              Upload your Google Service Account JSON credentials file
            </small>
          </div>

          <button
            onClick={handleSetup}
            disabled={isLoading || !credentialsFile}
            className="btn btn-primary"
          >
            {isLoading ? 'Connecting...' : 'Connect to Google Sheets'}
          </button>
        </div>
      )}

      <div className="setup-instructions">
        <h4>Setup Instructions:</h4>
        <ol>
          <li>Go to Google Cloud Console and create a new project</li>
          <li>Enable the Google Sheets API</li>
          <li>Create a Service Account and download the JSON credentials</li>
          <li>Share your Google Sheet with the service account email</li>
          <li>Upload the credentials file above</li>
        </ol>
      </div>
    </div>
  );
};

export default GoogleSheetsSetup;
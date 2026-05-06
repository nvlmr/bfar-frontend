import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, Database, BarChart3, ArrowLeft, Import } from 'lucide-react';

const MLUpload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      validateAndProcessFile(selectedFile);
    }
  };

  // Validate and process file
  const validateAndProcessFile = (file) => {
    setError(null);
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }
    
    // Check file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      setError('Only CSV files are allowed');
      return;
    }
    
    setFile(file);
    parseCSV(file);
  };

  // Parse CSV file
  const parseCSV = (file) => {
    setIsLoading(true);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        
        if (!text.trim()) {
          setError('CSV file is empty');
          setIsLoading(false);
          return;
        }
        
        // Better CSV parsing that handles quoted commas
        const rows = parseCSVRows(text);
        
        if (rows.length === 0) {
          setError('No valid data found in CSV');
          setIsLoading(false);
          return;
        }
        
        // Extract headers
        const headers = rows[0].map(header => header.trim());
        
        // Filter out empty headers
        const validHeaders = headers.filter(header => header.length > 0);
        
        if (validHeaders.length === 0) {
          setError('No valid column headers found');
          setIsLoading(false);
          return;
        }
        
        setColumns(validHeaders);
        
        // Extract data rows
        const data = rows.slice(1).map(row => {
          const rowObj = {};
          validHeaders.forEach((header, index) => {
            rowObj[header] = row[index] || '';
          });
          return rowObj;
        }).filter(row => Object.values(row).some(value => value.trim())); // Filter empty rows
        
        setCsvData(data);
        setIsLoading(false);
        
      } catch (err) {
        setError('Failed to parse CSV file. Please check the file format.');
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read file');
      setIsLoading(false);
    };
    
    reader.readAsText(file);
  };

  // Better CSV parsing that handles quoted fields
  const parseCSVRows = (text) => {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' && !inQuotes) {
        // Row separator
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add last field and row
    if (currentField.trim() || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
    }
    
    return rows;
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndProcessFile(droppedFile);
    }
  };

  // Handle analyze button click
  const handleAnalyze = () => {
    console.log('Analyze button clicked - placeholder for future implementation');
    // Placeholder for future ML analysis functionality
  };

  // Handle back to dashboard
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Handle import form from CSV
  const handleImportForm = () => {
    if (csvData.length === 0 || columns.length === 0) {
      setError('No data available to import');
      return;
    }
    
    try {
      // Create form structure from CSV data
      const formFields = columns.map((column, index) => ({
        id: `field_${index}`,
        type: 'text', // Default to text field
        label: column,
        required: false,
        placeholder: `Enter ${column}`
      }));

      const formData = {
        title: `Imported Form - ${file?.name?.replace('.csv', '') || 'CSV Data'}`,
        description: `Form created from CSV import with ${columns.length} fields and ${csvData.length} data rows`,
        fields: formFields
      };

      // Navigate to form builder with pre-filled data
      navigate('/forms/new', { state: { importedData: formData } });
    } catch (err) {
      setError('Failed to create form from CSV data');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={handleBackToDashboard}
            variant="outline"
            className="bg-white hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-slate-900 flex items-center justify-center gap-3">
              <BarChart3 className="w-10 h-10 text-blue-600" />
              Machine Learning Analysis
            </h1>
            <p className="text-slate-600 text-lg">Upload your CSV data for intelligent analysis</p>
          </div>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>

        {/* File Upload Section */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Upload className="w-5 h-5" />
              Import File
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      onClick={() => setError(null)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 relative ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
              } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-slate-600">Processing CSV file...</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-slate-700 font-medium mb-2">
                    {file ? file.name : 'Drop your CSV file here or click to browse'}
                  </p>
                  <p className="text-slate-500 text-sm">
                    Supports CSV files only (max 10MB)
                  </p>
                  {file && (
                    <p className="text-xs text-slate-400 mt-1">
                      Size: {(file.size / 1024).toFixed(2)} KB
                    </p>
                  )}
                </div>
                <div className="flex justify-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="bg-white hover:bg-slate-50"
                    disabled={isLoading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table Preview */}
        {csvData.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Database className="w-5 h-5" />
                Data Preview ({csvData.length} rows)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-96 rounded-lg border">
                <div className="min-w-full">
                  <table className="w-full">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {columns.map((column, index) => (
                          <th
                            key={index}
                            className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider border-b"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {csvData.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-slate-50 transition-colors">
                          {columns.map((column, colIndex) => (
                            <td
                              key={colIndex}
                              className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap"
                            >
                              {row[column]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!file && !isLoading && (
          <Card className="shadow-lg border-0 bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                <Database className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                No file uploaded yet
              </h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Upload a CSV file above to see your data preview and begin analysis
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {csvData.length > 0 && (
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleImportForm}
              size="lg"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Import className="w-5 h-5 mr-2" />
              Create Form from CSV
            </Button>
            <Button
              onClick={handleAnalyze}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Analyze Data
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MLUpload;

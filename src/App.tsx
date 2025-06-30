import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import SingleAnalysis from './pages/SingleAnalysis';
import ComparisonAnalysis from './pages/ComparisonAnalysis';
import Papa from 'papaparse';
import React, { useState } from 'react';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [data, setData] = useState<PerformanceResult[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedPerformanceResult[]>([]);
  const [isAnalyzed2, setIsAnalyzed2] = useState(false);
  const [data2, setData2] = useState<PerformanceResult[]>([]);
  const [groupedData2, setGroupedData2] = useState<GroupedPerformanceResult[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, isSecondFile = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    
    // Reset analysis state when new file is uploaded
    if (!isSecondFile) {
      setIsAnalyzed(false);
      setData([]);
      setGroupedData([]);
    } else {
      setIsAnalyzed2(false);
      setData2([]);
      setGroupedData2([]);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        Papa.parse<PerformanceResult>(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              setError(`CSV Parse Errors: ${JSON.stringify(results.errors)}`);
              setIsLoading(false);
              return;
            }

            if (!isSecondFile) {
              setData(results.data);
            } else {
              setData2(results.data);
            }
            setIsLoading(false);
          },
          error: (error) => {
            setError(`CSV Parse Error: ${error.message}`);
            setIsLoading(false);
          }
        });
      } catch (error) {
        setError(`File reading error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex space-x-8">
                <Link 
                  to="/compare" 
                  className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-indigo-600"
                >
                  Compare CSVs
                </Link>
                <Link 
                  to="/" 
                  className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-indigo-600"
                >
                  Single Analysis
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/compare" element={<ComparisonAnalysis />} />
          <Route path="/" element={<SingleAnalysis />} />
        </Routes>
      </div>
    </Router>
  );
}
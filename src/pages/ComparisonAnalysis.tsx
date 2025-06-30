import React from 'react';
import { useState, useRef } from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import {
  Card,
  Title,
  Grid,
  Text,
  Metric,
  Badge,
  Button,
  TextInput,
} from '@tremor/react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import type { PerformanceResult, GroupedResult } from '../types';

// Add ChartData type for chart arrays
type ChartData = { name: string; previousVersion: number; latestVersion: number };

export default function ComparisonAnalysis() {
  const [data1, setData1] = useState<PerformanceResult[]>([]);
  const [data2, setData2] = useState<PerformanceResult[]>([]);
  const [groupedData1, setGroupedData1] = useState<GroupedResult[]>([]);
  const [groupedData2, setGroupedData2] = useState<GroupedResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzed1, setIsAnalyzed1] = useState(false);
  const [isAnalyzed2, setIsAnalyzed2] = useState(false);
  const [file1Name, setFile1Name] = useState<string>("");
  const [file2Name, setFile2Name] = useState<string>("");
  const [version1, setVersion1] = useState<string>("");
  const [version2, setVersion2] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const loadChartRef = useRef<HTMLDivElement>(null);
  const runChartRef = useRef<HTMLDivElement>(null);
  const saveChartRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, isSecondFile = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isSecondFile) {
      setFile1Name(file.name);
      setIsAnalyzed1(false);
    } else {
      setFile2Name(file.name);
      setIsAnalyzed2(false);
    }

    setIsLoading(true);
    setError(null);

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

            // Get version from first row
            const version = results.data[0]?.Version || "Unknown";

            if (!isSecondFile) {
              setData1(results.data);
              setVersion1(version);
              processData(results.data, setGroupedData1);
              setIsAnalyzed1(true);
            } else {
              setData2(results.data);
              setVersion2(version);
              processData(results.data, setGroupedData2);
              setIsAnalyzed2(true);
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

    reader.readAsText(file);
  };

  const processData = (results: PerformanceResult[], setGrouped: React.Dispatch<React.SetStateAction<GroupedResult[]>>) => {
    if (!results.length) return;

    const grouped = results.reduce((acc: { [key: string]: GroupedResult }, curr) => {
      const baseName = curr.Page.split('_')[0];
      if (!acc[baseName]) {
        acc[baseName] = {
          name: baseName,
          loadTime: 0,
          runTime: 0,
          saveTime: 0
        };
      }
      
      if (curr.Page.includes('Load')) {
        acc[baseName].loadTime = curr['Time(Seconds)'];
      } else if (curr.Page.includes('Run')) {
        acc[baseName].runTime = curr['Time(Seconds)'];
      } else if (curr.Page.includes('Save')) {
        acc[baseName].saveTime = curr['Time(Seconds)'];
      }
      
      return acc;
    }, {});

    setGrouped(Object.values(grouped));
  };

  const getComparisonMetrics = () => {
    if (!data1.length || !data2.length) return null;

    const metrics = {
      totalTime: {
        csv1: data1.reduce((sum, curr) => sum + curr['Time(Seconds)'], 0),
        csv2: data2.reduce((sum, curr) => sum + curr['Time(Seconds)'], 0),
      },
      loadTime: {
        csv1: data1.filter(d => d.Page.includes('Load')).reduce((sum, curr) => sum + curr['Time(Seconds)'], 0),
        csv2: data2.filter(d => d.Page.includes('Load')).reduce((sum, curr) => sum + curr['Time(Seconds)'], 0),
      },
      saveTime: {
        csv1: data1.filter(d => d.Page.includes('Save')).reduce((sum, curr) => sum + curr['Time(Seconds)'], 0),
        csv2: data2.filter(d => d.Page.includes('Save')).reduce((sum, curr) => sum + curr['Time(Seconds)'], 0),
      },
      testCounts: {
        csv1: {
          load: data1.filter(d => d.Page.includes('Load')).length,
          run: data1.filter(d => d.Page.includes('Run')).length,
          save: data1.filter(d => d.Page.includes('Save')).length,
        },
        csv2: {
          load: data2.filter(d => d.Page.includes('Load')).length,
          run: data2.filter(d => d.Page.includes('Run')).length,
          save: data2.filter(d => d.Page.includes('Save')).length,
        },
      },
      differences: {
        totalTime: Number(((data2.reduce((sum, curr) => sum + curr['Time(Seconds)'], 0) / 
                    data1.reduce((sum, curr) => sum + curr['Time(Seconds)'], 0) - 1) * 100).toFixed(2)),
        loadTime: Number(((data2.filter(d => d.Page.includes('Load')).reduce((sum, curr) => sum + curr['Time(Seconds)'], 0) /
                   data1.filter(d => d.Page.includes('Load')).reduce((sum, curr) => sum + curr['Time(Seconds)'], 0) - 1) * 100).toFixed(2)),
        saveTime: Number(((data2.filter(d => d.Page.includes('Save')).reduce((sum, curr) => sum + curr['Time(Seconds)'], 0) /
                   data1.filter(d => d.Page.includes('Save')).reduce((sum, curr) => sum + curr['Time(Seconds)'], 0) - 1) * 100).toFixed(2)),
      }
    };

    return metrics;
  };

  const getDifferenceColor = (difference: number) => {
    if (Math.abs(difference) > 20) return "red";
    if (Math.abs(difference) > 10) return "amber";
    return "emerald";
  };

  const getTestCountAlert = (csv1Count: number, csv2Count: number) => {
    if (csv1Count !== csv2Count) {
      return (
        <Badge color="red" className="ml-2">
          Test count mismatch!
        </Badge>
      );
    }
    return null;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const metrics = getComparisonMetrics();
    
    if (!metrics) return;
    
    // Add title
    doc.setFontSize(20);
    doc.text('Performance Comparison Report', 20, 20);
    
    // Add file names with versions
    doc.setFontSize(12);
    doc.text(`File 1 (${version1}): ${file1Name}`, 20, 35);
    doc.text(`File 2 (${version2}): ${file2Name}`, 20, 45);
    
    // Add summary metrics
    doc.setFontSize(14);
    doc.text('Summary Metrics', 20, 60);
    
    const summaryData = [
      ['Metric', version1, version2, `Difference (${version2} - ${version1})`],
      ['Total Time', 
        `${metrics.totalTime.csv1.toFixed(2)}s`,
        {
          content: `${metrics.totalTime.csv2.toFixed(2)}s`,
          styles: { textColor: metrics.totalTime.csv2 > metrics.totalTime.csv1 ? [255, 0, 0] as [number, number, number] : [0, 128, 0] as [number, number, number] }
        },
        {
          content: `${(metrics.totalTime.csv2 - metrics.totalTime.csv1).toFixed(2)}s`,
          styles: { textColor: (metrics.totalTime.csv2 - metrics.totalTime.csv1) > 0 ? [255, 0, 0] as [number, number, number] : [0, 128, 0] as [number, number, number] }
        }
      ]
    ];
    
    autoTable(doc, {
      startY: 65,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 50 }
      }
    });

    // Add detailed test comparison
    const finalY1 = (doc as any).lastAutoTable.finalY;
    doc.text('Detailed Test Comparison', 20, finalY1 + 20);

    // Prepare detailed test data
    const detailedTestData: Array<[
      string,
      string,
      { content: string; styles: { textColor: [number, number, number] } },
      { content: string; styles: { textColor: [number, number, number] } }
    ]> = [];
    const testTypes = ['Load', 'Run', 'Save'];

    data1.forEach(test1 => {
      const matchingTest2 = data2.find(test2 => test2.Page === test1.Page);
      if (matchingTest2) {
        const testType = testTypes.find(type => test1.Page.includes(type));
        if (testType) {
          const time1 = test1['Time(Seconds)'];
          const time2 = matchingTest2['Time(Seconds)'];
          const absoluteDiff = time2 - time1;
          
          detailedTestData.push([
            test1.Page,
            `${time1.toFixed(2)}s`,
            {
              content: `${time2.toFixed(2)}s`,
              styles: { textColor: time2 > time1 ? [255, 0, 0] as [number, number, number] : [0, 128, 0] as [number, number, number] }
            },
            {
              content: `${absoluteDiff.toFixed(2)}s`,
              styles: { textColor: absoluteDiff > 0 ? [255, 0, 0] as [number, number, number] : [0, 128, 0] as [number, number, number] }
            }
          ]);
        }
      }
    });

    // Sort by test type (Load, Run, Save) and then by name
    detailedTestData.sort((a, b) => {
      const typeA = testTypes.findIndex(type => (a[0] as string).includes(type));
      const typeB = testTypes.findIndex(type => (b[0] as string).includes(type));
      if (typeA !== typeB) return typeA - typeB;
      return (a[0] as string).localeCompare(b[0] as string);
    });

    autoTable(doc, {
      startY: finalY1 + 25,
      head: [['Test Name', version1, version2, `Difference (${version2} - ${version1})`]],
      body: detailedTestData,
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 40 }
      }
    });

    // Add performance degradation summary
    const finalY2 = (doc as any).lastAutoTable.finalY;
    const degradedTests = detailedTestData.filter(test => {
      const time1 = parseFloat((test[1] as string).replace('s', ''));
      const time2 = parseFloat((test[2] as { content: string }).content.replace('s', ''));
      return time2 > time1;
    });

    if (degradedTests.length > 0) {
      doc.setTextColor(255, 0, 0);
      doc.text('Performance Degradations Detected:', 20, finalY2 + 20);
      
      const degradationSummary = degradedTests.map(test => ({
        name: test[0] as string,
        difference: (test[3] as { content: string }).content
      }));
      
      degradationSummary.forEach((item, index) => {
        doc.text(`• ${item.name}: slower by ${item.difference}`, 25, finalY2 + 30 + (index * 10));
      });
      doc.setTextColor(0, 0, 0);
    }
    
    // Save the PDF
    doc.save('performance-comparison.pdf');
  };

  const exportToJPG = async (chartRef: React.RefObject<HTMLDivElement>, chartName: string) => {
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, {
          scale: 2, // Higher quality
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        
        const link = document.createElement('a');
        link.download = `${chartName.toLowerCase().replace(/\s+/g, '-')}-comparison.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 1.0);
        link.click();
      } catch (error) {
        console.error('Error exporting chart:', error);
      }
    }
  };

  const getChartHeight = (data: any[]) => {
    const baseHeight = 400; // Minimum height
    const itemHeight = 40; // Height per item
    const maxHeight = 1200; // Maximum height
    const calculatedHeight = baseHeight + (data.length * itemHeight);
    return Math.min(Math.max(calculatedHeight, baseHeight), maxHeight);
  };

  const loadChartData = (data1
    .filter(test => test.Page.includes('Load') && test.Page.toLowerCase().includes(searchTerm.toLowerCase()))
    .map(test1 => {
      const test2 = data2.find(t => t.Page === test1.Page);
      if (test2) {
        return {
          name: test1.Page,
          previousVersion: Number(test1['Time(Seconds)']),
          latestVersion: Number(test2['Time(Seconds)'])
        };
      }
      return null;
    })
    .filter(Boolean) as ChartData[]).sort((a, b) => b.previousVersion - a.previousVersion);

  const runChartData = (data1
    .filter(test => test.Page.includes('Run') && test.Page.toLowerCase().includes(searchTerm.toLowerCase()))
    .map(test1 => {
      const test2 = data2.find(t => t.Page === test1.Page);
      if (test2) {
        return {
          name: test1.Page,
          previousVersion: Number(test1['Time(Seconds)']),
          latestVersion: Number(test2['Time(Seconds)'])
        };
      }
      return null;
    })
    .filter(Boolean) as ChartData[]).sort((a, b) => b.previousVersion - a.previousVersion);

  const saveChartData = (data1
    .filter(test => test.Page.includes('Save') && test.Page.toLowerCase().includes(searchTerm.toLowerCase()))
    .map(test1 => {
      const test2 = data2.find(t => t.Page === test1.Page);
      if (test2) {
        return {
          name: test1.Page,
          previousVersion: Number(test1['Time(Seconds)']),
          latestVersion: Number(test2['Time(Seconds)'])
        };
      }
      return null;
    })
    .filter(Boolean) as ChartData[]).sort((a, b) => b.previousVersion - a.previousVersion);

  return (
    <div className="p-8">
      <div className="max-w-full mx-0">
        <Title className="text-3xl font-bold mb-8">CSV Comparison Analysis</Title>

        <Card className="mb-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileUpload(e, false)}
                  className="hidden"
                  id="file1"
                />
                <label 
                  htmlFor="file1" 
                  className="cursor-pointer bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Upload Previous Version CSV
                </label>
              </div>
              {file1Name && (
                <div className="flex items-center gap-2">
                  <Badge color={isAnalyzed1 ? "green" : "yellow"}>
                    {file1Name}
                  </Badge>
                  {isAnalyzed1 && <Badge color="green">✓ Analyzed</Badge>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileUpload(e, true)}
                  className="hidden"
                  id="file2"
                />
                <label 
                  htmlFor="file2" 
                  className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Upload Latest Version CSV
                </label>
              </div>
              {file2Name && (
                <div className="flex items-center gap-2">
                  <Badge color={isAnalyzed2 ? "green" : "yellow"}>
                    {file2Name}
                  </Badge>
                  {isAnalyzed2 && <Badge color="green">✓ Analyzed</Badge>}
                </div>
              )}
              {isAnalyzed1 && isAnalyzed2 && (
                <div className="flex gap-2">
                  <Button
                    onClick={exportToPDF}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded"
                    size="xs"
                  >
                    Export to PDF
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {error && (
          <Card className="mb-8 bg-red-50">
            <Text className="text-red-600">{error}</Text>
          </Card>
        )}

        {isLoading && (
          <Card className="mb-8">
            <Text>Loading data...</Text>
          </Card>
        )}

        {!isAnalyzed1 && !isAnalyzed2 && !isLoading && !error && (
          <Card className="mb-8 bg-blue-50">
            <Text className="text-blue-600">
              Please upload two CSV files to compare their performance metrics.
            </Text>
          </Card>
        )}

        {isAnalyzed1 && !isAnalyzed2 && !isLoading && (
          <Card className="mb-8 bg-yellow-50">
            <Text className="text-yellow-600">
              First file analyzed. Please upload the second CSV file for comparison.
            </Text>
          </Card>
        )}

        {isAnalyzed1 && isAnalyzed2 && (
          <>
            {/* Add search bar */}
            <Card className="mb-8">
              <div className="mb-4">
                <Text>Search Tests</Text>
                <div className="relative">
                  <TextInput
                    icon={MagnifyingGlassIcon}
                    placeholder="Search by test name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                      aria-label="Clear search"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </Card>

            {/* Add a warning section for significant deviations */}
            {((getComparisonMetrics()?.differences.totalTime || 0) > 20 ||
              (getComparisonMetrics()?.differences.loadTime || 0) > 20 ||
              (getComparisonMetrics()?.differences.saveTime || 0) > 20) && (
                <Card className="mb-8 bg-red-50">
                  <Text className="text-red-600 font-medium">
                    ⚠️ Significant performance deviation detected! Some metrics show more than 20% difference.
                  </Text>
                </Card>
              )}

            {/* Load Time and Run Time Comparison Charts Side by Side */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <Card>
                <Title>Load Time Comparison</Title>
                <div ref={loadChartRef} style={{ height: getChartHeight(data1.filter(test => test.Page.includes('Load') && test.Page.toLowerCase().includes(searchTerm.toLowerCase()))), width: '100%', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={loadChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 100, left: 150, bottom: 5 }}
                      barGap={5}
                      barSize={20}
                    >
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#e5e7eb"
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis 
                        type="number"
                        label={{ 
                          value: 'Time (seconds)', 
                          position: 'insideBottom',
                          offset: -5
                        }}
                        tickFormatter={(value) => `${value.toFixed(2)}s`}
                        domain={[0, 'dataMax + 1']}
                      />
                      <YAxis 
                        type="category"
                        dataKey="name"
                        width={150}
                        tick={{ fontSize: 9, fill: '#1f2937' }}
                        interval={0}
                        tickMargin={1}
                        axisLine={{ stroke: '#666' }}
                        padding={{ top: 20, bottom: 20 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-4 border rounded shadow">
                                <p className="font-bold mb-2">{data.name}</p>
                                <p className="text-[#374151]">{version1}: {data.previousVersion.toFixed(2)}s</p>
                                <p className="text-[#059669]">{version2}: {data.latestVersion.toFixed(2)}s</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        formatter={(value) => (
                          <span style={{ 
                            color: value === version1 ? '#374151' : '#059669',
                            fontWeight: 500,
                            fontSize: '12px'
                          }}>
                            {value}
                          </span>
                        )}
                        verticalAlign="top"
                        align="left"
                        wrapperStyle={{ paddingTop: '5px' }}
                      />
                      <Bar
                        dataKey="latestVersion"
                        name={version2}
                        fill="#059669"
                        label={{
                          position: 'inside',
                          fill: '#fff',
                          fontSize: 12,
                          formatter: (value) => `${value.toFixed(2)}s`
                        }}
                      >
                        {loadChartData.map((entry, idx) => (
                          <Cell
                            key={entry.name + '-' + idx}
                            fill={entry.latestVersion > entry.previousVersion ? "#ef4444" : "#059669"}
                          />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="previousVersion"
                        name={version1}
                        fill="#d1d5db"
                        label={{
                          position: 'right',
                          fill: '#374151',
                          fontSize: 12,
                          formatter: (value) => `${value.toFixed(2)}s`
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
                    <Button
                      onClick={() => exportToJPG(loadChartRef, 'Load Time')}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded"
                      size="xs"
                    >
                      Export as JPG
                    </Button>
                  </div>
                </div>
              </Card>

              <Card>
                <Title>Run Time Comparison</Title>
                <div ref={runChartRef} style={{ height: getChartHeight(data1.filter(test => test.Page.includes('Run') && test.Page.toLowerCase().includes(searchTerm.toLowerCase()))), width: '100%', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={runChartData}
                      layout="vertical"
                      margin={{ top: 10, right: 100, left: 150, bottom: 10 }}
                      barGap={5}
                      barSize={20}
                    >
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#e5e7eb"
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis 
                        type="number"
                        label={{ 
                          value: 'Time (seconds)', 
                          position: 'insideBottom',
                          offset: -5
                        }}
                        tickFormatter={(value) => `${value.toFixed(2)}s`}
                        domain={[0, 'dataMax + 1']}
                      />
                      <YAxis 
                        type="category"
                        dataKey="name"
                        width={250}
                        tick={{ fontSize: 10, fill: '#1f2937' }}
                        interval={0}
                        tickMargin={2}
                        axisLine={{ stroke: '#666' }}
                        padding={{ top: 20, bottom: 20 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-4 border rounded shadow">
                                <p className="font-bold mb-2">{data.name}</p>
                                <p className="text-[#374151]">{version1}: {data.previousVersion.toFixed(2)}s</p>
                                <p className="text-[#059669]">{version2}: {data.latestVersion.toFixed(2)}s</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        formatter={(value) => (
                          <span style={{ 
                            color: value === version1 ? '#374151' : '#059669',
                            fontWeight: 500,
                            fontSize: '12px'
                          }}>
                            {value}
                          </span>
                        )}
                        verticalAlign="top"
                        align="left"
                        wrapperStyle={{ paddingTop: '5px' }}
                      />
                      <Bar
                        dataKey="latestVersion"
                        name={version2}
                        fill="#059669"
                        label={{
                          position: 'inside',
                          fill: '#fff',
                          fontSize: 12,
                          formatter: (value) => `${value.toFixed(2)}s`
                        }}
                      >
                        {runChartData.map((entry, idx) => (
                          <Cell
                            key={entry.name + '-' + idx}
                            fill={entry.latestVersion > entry.previousVersion ? "#ef4444" : "#059669"}
                          />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="previousVersion"
                        name={version1}
                        fill="#d1d5db"
                        label={{
                          position: 'right',
                          fill: '#374151',
                          fontSize: 12,
                          formatter: (value) => `${value.toFixed(2)}s`
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
                    <Button
                      onClick={() => exportToJPG(runChartRef, 'Run Time')}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded"
                      size="xs"
                    >
                      Export as JPG
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Save Time Comparison Chart */}
            <Card className="mb-8">
              <Title>Save Time Comparison</Title>
              <div ref={saveChartRef} style={{ height: getChartHeight(data1.filter(test => test.Page.includes('Save') && test.Page.toLowerCase().includes(searchTerm.toLowerCase()))), width: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={saveChartData}
                    layout="vertical"
                    margin={{ top: 10, right: 100, left: 150, bottom: 10 }}
                    barGap={5}
                    barSize={20}
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="#e5e7eb"
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis 
                      type="number"
                      label={{ 
                        value: 'Time (seconds)', 
                        position: 'insideBottom',
                        offset: -5
                      }}
                      tickFormatter={(value) => `${value.toFixed(2)}s`}
                      domain={[0, 'dataMax + 1']}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name"
                      width={150}
                      tick={{ fontSize: 10, fill: '#1f2937' }}
                      interval={0}
                      tickMargin={2}
                      axisLine={{ stroke: '#666' }}
                      padding={{ top: 20, bottom: 20 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-4 border rounded shadow">
                              <p className="font-bold mb-2">{data.name}</p>
                              <p className="text-[#374151]">{version1}: {data.previousVersion.toFixed(2)}s</p>
                              <p className="text-[#059669]">{version2}: {data.latestVersion.toFixed(2)}s</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      formatter={(value) => (
                        <span style={{ 
                          color: value === version1 ? '#374151' : '#059669',
                          fontWeight: 500,
                          fontSize: '12px'
                        }}>
                          {value}
                        </span>
                      )}
                      verticalAlign="top"
                      align="left"
                      wrapperStyle={{ paddingTop: '5px' }}
                    />
                    <Bar
                      dataKey="latestVersion"
                      name={version2}
                      fill="#059669"
                      label={{
                        position: 'inside',
                        fill: '#fff',
                        fontSize: 12,
                        formatter: (value) => `${value.toFixed(2)}s`
                      }}
                    >
                      {saveChartData.map((entry, idx) => (
                        <Cell
                          key={entry.name + '-' + idx}
                          fill={entry.latestVersion > entry.previousVersion ? "#ef4444" : "#059669"}
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="previousVersion"
                      name={version1}
                      fill="#d1d5db"
                      label={{
                        position: 'right',
                        fill: '#374151',
                        fontSize: 12,
                        formatter: (value) => `${value.toFixed(2)}s`
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
                  <Button
                    onClick={() => exportToJPG(saveChartRef, 'Save Time')}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded"
                    size="xs"
                  >
                    Export as JPG
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
} 
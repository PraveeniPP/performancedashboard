import { useState } from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Card,
  Title,
  Grid,
  Text,
  Metric,
  Tab,
  TabList,
  TabGroup,
  TabPanel,
  TabPanels,
  TextInput,
  List,
  ListItem,
  Badge,
  Button,
} from '@tremor/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PerformanceResult, GroupedResult } from '../types';

export default function SingleAnalysis() {
  const [data, setData] = useState<PerformanceResult[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzed, setIsAnalyzed] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setIsAnalyzed(false);
    setData([]);
    setGroupedData([]);

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

            setData(results.data);
            processData(results.data);
            setIsAnalyzed(true);
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

  const processData = (results: PerformanceResult[]) => {
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

    setGroupedData(Object.values(grouped));
  };

  const getMetrics = () => {
    if (data.length === 0) return {
      totalTestTime: "0.00",
      averageLoadTime: "0.00",
      medianLoadTime: "0.00",
      testCounts: { load: 0, run: 0, save: 0 },
      top5SlowestTests: []
    };

    const loadTests = data.filter(d => d.Page.includes('Load'));
    const sorted = [...loadTests].sort((a, b) => a['Time(Seconds)'] - b['Time(Seconds)']);
    const mid = Math.floor(sorted.length / 2);

    return {
      totalTestTime: data.reduce((sum, curr) => sum + curr['Time(Seconds)'], 0).toFixed(2),
      averageLoadTime: loadTests.length ? (loadTests.reduce((sum, curr) => sum + curr['Time(Seconds)'], 0) / loadTests.length).toFixed(2) : "0.00",
      medianLoadTime: loadTests.length ? (sorted.length % 2 === 0 ? ((sorted[mid - 1]['Time(Seconds)'] + sorted[mid]['Time(Seconds)']) / 2).toFixed(2) : sorted[mid]['Time(Seconds)'].toFixed(2)) : "0.00",
      testCounts: {
        load: data.filter(d => d.Page.includes('Load')).length,
        run: data.filter(d => d.Page.includes('Run')).length,
        save: data.filter(d => d.Page.includes('Save')).length,
      },
      top5SlowestTests: [...data].sort((a, b) => b['Time(Seconds)'] - a['Time(Seconds)']).slice(0, 5)
    };
  };

  const filteredData = data.filter(item => 
    item.Page.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToPDF = () => {
    const doc = new jsPDF();
    const metrics = getMetrics();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Performance Analysis Report', 20, 20);
    
    // Add summary metrics
    doc.setFontSize(14);
    doc.text('Summary Metrics', 20, 40);
    
    const summaryData = [
      ['Total Test Duration', `${metrics.totalTestTime} seconds`],
      ['Average Load Time', `${metrics.averageLoadTime} seconds`],
      ['Median Load Time', `${metrics.medianLoadTime} seconds`],
      ['Load Tests Count', `${metrics.testCounts.load}`],
      ['Run Tests Count', `${metrics.testCounts.run}`],
      ['Save Tests Count', `${metrics.testCounts.save}`],
    ];
    
    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: summaryData,
    });
    
    // Add top 5 slowest tests
    doc.text('Top 5 Slowest Tests', 20, doc.lastAutoTable.finalY + 20);
    
    const slowestTestsData = metrics.top5SlowestTests.map(test => [
      test.Page,
      `${test['Time(Seconds)'].toFixed(2)} seconds`
    ]);
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 25,
      head: [['Test Name', 'Duration']],
      body: slowestTestsData,
    });
    
    // Add all test results
    doc.text('All Test Results', 20, doc.lastAutoTable.finalY + 20);
    
    const testData = data.map(test => [
      test.Page,
      test.Date,
      test['Computer Name'],
      test.Version,
      `${test['Time(Seconds)'].toFixed(2)} seconds`
    ]);
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 25,
      head: [['Test Name', 'Date', 'Computer', 'Version', 'Duration']],
      body: testData,
    });
    
    // Save the PDF
    doc.save('performance-analysis.pdf');
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <Title className="text-3xl font-bold mb-8">Performance Analysis</Title>

        <div className="flex gap-4 mb-8">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csvFile"
          />
          <label
            htmlFor="csvFile"
            className="cursor-pointer bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Upload CSV
          </label>
          {isAnalyzed && (
            <Button
              onClick={exportToPDF}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              size="xs"
            >
              Export to PDF
            </Button>
          )}
        </div>

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

        {isAnalyzed && data.length > 0 && (
          <>
            <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6 mb-8">
              <Card className="metric-card indigo">
                <Text className="text-gray-600">Total Test Duration</Text>
                <Metric className="text-indigo-600">{getMetrics().totalTestTime} seconds</Metric>
              </Card>
              <Card className="metric-card emerald">
                <Text className="text-gray-600">Average Load Time</Text>
                <Metric className="text-emerald-600">{getMetrics().averageLoadTime} seconds</Metric>
              </Card>
              <Card className="metric-card amber">
                <Text className="text-gray-600">Median Load Time</Text>
                <Metric className="text-amber-600">{getMetrics().medianLoadTime} seconds</Metric>
              </Card>
            </Grid>

            <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6 mb-8">
              {Object.entries(getMetrics().testCounts).map(([type, count]) => (
                <Card key={type} className="metric-card blue">
                  <Text className="text-gray-600 capitalize">{type} Tests Count</Text>
                  <Metric className="text-blue-600">{count}</Metric>
                </Card>
              ))}
            </Grid>

            <Card className="mb-8">
              <Title className="text-lg font-medium mb-4">Top 5 Slowest Tests</Title>
              <List>
                {getMetrics().top5SlowestTests.map((test, idx) => (
                  <ListItem key={idx} className="hover:bg-gray-50">
                    <Text className="font-medium">{test.Page}</Text>
                    <Badge size="xl" color={idx === 0 ? "red" : idx < 3 ? "amber" : "yellow"}>
                      {test['Time(Seconds)'].toFixed(2)}s
                    </Badge>
                  </ListItem>
                ))}
              </List>
            </Card>

            <TabGroup>
              <TabList className="mb-8">
                <Tab>Performance Overview</Tab>
                <Tab>Detailed Metrics</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <Card>
                    <Title>Test Execution Times by Component</Title>
                    <div className="h-[400px] mt-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={groupedData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => `${value.toFixed(2)}s`} />
                          <Legend />
                          <Bar dataKey="loadTime" fill="#4f46e5" name="Load Time" />
                          <Bar dataKey="runTime" fill="#059669" name="Run Time" />
                          <Bar dataKey="saveTime" fill="#dc2626" name="Save Time" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </TabPanel>
                <TabPanel>
                  <Card>
                    <div className="mb-6">
                      <Text>Search Tests</Text>
                      <TextInput
                        icon={MagnifyingGlassIcon}
                        placeholder="Search by test name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Title>Individual Test Times</Title>
                    <div className="h-[600px] mt-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={filteredData}
                          layout="vertical"
                          margin={{ left: 200, right: 20, top: 20, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="Page" width={180} />
                          <Tooltip formatter={(value: number) => `${value.toFixed(2)}s`} />
                          <Bar dataKey="Time(Seconds)" fill="#8b5cf6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </TabPanel>
              </TabPanels>
            </TabGroup>
          </>
        )}
      </div>
    </div>
  );
} 
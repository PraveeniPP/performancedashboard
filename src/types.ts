export interface PerformanceResult {
  Page: string;
  Date: string;
  "Computer Name": string;
  Version: string;
  Method: string;
  "Time(Seconds)": number;
}

export interface GroupedResult {
  name: string;
  loadTime: number;
  runTime: number;
  saveTime: number;
} 
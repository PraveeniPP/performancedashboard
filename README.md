# Performance Test Dashboard

A React-based dashboard for visualizing and analyzing test performance metrics. Built with Vite, TypeScript, Tailwind CSS, Tremor UI components, and Recharts.

## Features

- 📊 Interactive performance visualization
- 🔍 Search functionality for specific tests
- 📈 Multiple chart types and metrics:
  - Test execution times by component
  - Individual test performance
  - Top 5 slowest tests
  - Load/Run/Save time analysis
- 📱 Responsive design
- 🎨 Clean, modern UI with Tailwind CSS

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

## Quick Start

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd test_dashboard
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Add your CSV file:**

   - Place `performanceResults.csv` in the `public` directory
   - Required format:

     ```csv
     Page,Time(Seconds)
     TestName_Load,1.23
     TestName_Run,2.34
     TestName_Save,3.45
     ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

5. **Build for production:**

   ```bash
   npm run build
   ```

6. **Preview the production build:**

   ```bash
   npm run preview
   ```

## Tech Stack

- [Vite](https://vitejs.dev/) - Build tool and development server
- [React](https://reactjs.org/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Tremor](https://www.tremor.so/) - UI components
- [Recharts](https://recharts.org/) - Charting library
- [Papa Parse](https://www.papaparse.com/) - CSV parsing

## Project Structure

```bash
test_dashboard/
├── public/
│   └── performanceResults.csv
├── src/
│   ├── App.tsx
│   ├── types.ts
│   ├── main.tsx
│   └── utils.ts
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── vite.config.js
```

### Metrics covered
- Total test time
- Average load time
- Median load time
- Top 5 slowest tests
- Test count by type (load, run, save)
- Individual test times


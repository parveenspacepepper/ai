// import { DynamicStructuredTool } from "langchain/tools";
// import { z } from "zod";
// import * as XLSX from 'xlsx';
// import { parse } from 'csv-parse/sync';
// import fs from 'fs';
// import path from 'path';

// // Types for file analysis results
// interface FileAnalysisResult {
//   headers: string[];
//   rowCount: number;
//   columnCount: number;
//   data: any[];
//   summary: {
//     numericColumns: string[];
//     dateColumns: string[];
//     categoricalColumns: string[];
//   };
// }

// // Interface for column statistics
// interface ColumnStats {
//   columnName: string;
//   count: number;
//   uniqueValues: number;
//   type: string;
//   min?: number;
//   max?: number;
//   average?: number;
// }

// // Function to analyze Excel files
// async function analyzeExcelFile(filePath: string): Promise<FileAnalysisResult> {
//   const workbook = XLSX.readFile(filePath);
//   const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
//   const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
  
//   const headers = data[0] as string[];
//   const rows = data.slice(1);
  
//   return {
//     headers,
//     rowCount: rows.length,
//     columnCount: headers.length,
//     data: rows,
//     summary: analyzeColumns(rows, headers)
//   };
// }

// // Function to analyze CSV files
// async function analyzeCSVFile(filePath: string): Promise<FileAnalysisResult> {
//   const fileContent = fs.readFileSync(filePath, 'utf-8');
//   const data = parse(fileContent, {
//     columns: true,
//     skip_empty_lines: true
//   });
  
//   const headers = Object.keys(data[0] || {});
  
//   return {
//     headers,
//     rowCount: data.length,
//     columnCount: headers.length,
//     data,
//     summary: analyzeColumns(data, headers)
//   };
// }

// // Helper function to analyze column types
// function analyzeColumns(data: any[], headers: string[]) {
//   const numericColumns: string[] = [];
//   const dateColumns: string[] = [];
//   const categoricalColumns: string[] = [];
  
//   headers.forEach(header => {
//     const columnValues = data.map(row => row[header]);
//     const hasNumbers = columnValues.some(val => typeof val === 'number' || !isNaN(Number(val)));
//     const hasDates = columnValues.some(val => val instanceof Date || !isNaN(Date.parse(val)));
    
//     if (hasNumbers && !hasDates) {
//       numericColumns.push(header);
//     } else if (hasDates) {
//       dateColumns.push(header);
//     } else {
//       categoricalColumns.push(header);
//     }
//   });
  
//   return {
//     numericColumns,
//     dateColumns,
//     categoricalColumns
//   };
// }

// // Main tool export
// export const fileAnalysisTool = new DynamicStructuredTool({
//   name: "file_analysis",
//   description: "Analyzes Excel and CSV files to extract insights and statistics",
//   schema: z.object({
//     action: z.enum(["analyze", "get_summary", "get_column_stats"]),
//     filePath: z.string().describe("Path to the file relative to the data directory"),
//     columnName: z.string().optional().describe("Name of the column to analyze (for column_stats action)")
//   }),
//   func: async ({ action, filePath, columnName }) => {
//     const fullPath = path.join(process.cwd(), 'data', filePath);
    
//     if (!fs.existsSync(fullPath)) {
//       throw new Error(`File not found: ${fullPath}`);
//     }
    
//     const fileExt = path.extname(filePath).toLowerCase();
//     let analysis: FileAnalysisResult;
    
//     if (fileExt === '.xlsx' || fileExt === '.xls') {
//       analysis = await analyzeExcelFile(fullPath);
//     } else if (fileExt === '.csv') {
//       analysis = await analyzeCSVFile(fullPath);
//     } else {
//       throw new Error(`Unsupported file type: ${fileExt}`);
//     }
    
//     switch (action) {
//       case "analyze":
//         return JSON.stringify(analysis, null, 2);
        
//       case "get_summary":
//         return JSON.stringify({
//           totalRows: analysis.rowCount,
//           totalColumns: analysis.columnCount,
//           columnTypes: analysis.summary
//         }, null, 2);
        
//       case "get_column_stats":
//         if (!columnName) {
//           throw new Error("Column name is required for column_stats action");
//         }
        
//         const columnData = analysis.data.map(row => row[columnName]);
//         const stats: ColumnStats = {
//           columnName,
//           count: columnData.length,
//           uniqueValues: new Set(columnData).size,
//           type: analysis.summary.numericColumns.includes(columnName) ? "numeric" :
//                 analysis.summary.dateColumns.includes(columnName) ? "date" : "categorical"
//         };
        
//         if (stats.type === "numeric") {
//           const numericValues = columnData.map(val => Number(val)).filter(val => !isNaN(val));
//           stats.min = Math.min(...numericValues);
//           stats.max = Math.max(...numericValues);
//           stats.average = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
//         }
        
//         return JSON.stringify(stats, null, 2);
        
//       default:
//         throw new Error(`Unknown action: ${action}`);
//     }
//   }
// }); 
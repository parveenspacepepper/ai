// import { DynamicStructuredTool } from "langchain/tools";
// import { z } from "zod";

// // Define types for Google Search Console API responses
// interface SearchConsoleQuery {
//   query: string;
//   clicks: number;
//   impressions: number;
//   ctr: number;
//   position: number;
//   date: string;
// }

// interface SearchConsolePage {
//   page: string;
//   clicks: number;
//   impressions: number;
//   ctr: number;
//   position: number;
//   date: string;
// }

// interface SearchConsoleCountry {
//   country: string;
//   clicks: number;
//   impressions: number;
//   ctr: number;
//   position: number;
//   date: string;
// }

// interface SearchConsoleDevice {
//   device: string;
//   clicks: number;
//   impressions: number;
//   ctr: number;
//   position: number;
//   date: string;
// }

// interface SearchConsoleSearchAppearance {
//   searchAppearance: string;
//   clicks: number;
//   impressions: number;
//   ctr: number;
//   position: number;
//   date: string;
// }

// // Function to fetch data from Google Search Console API
// const fetchFromSearchConsole = async (
//   endpoint: string,
//   accessToken: string,
//   siteUrl: string,
//   params: Record<string, string> = {}
// ): Promise<unknown> => {
//   const baseUrl = "https://www.googleapis.com/webmasters/v3";
//   const queryParams = new URLSearchParams({
//     access_token: accessToken,
//     ...params,
//   });

//   const url = `${baseUrl}/${endpoint}?${queryParams.toString()}`;
//   const response = await fetch(url, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       startDate: params.startDate,
//       endDate: params.endDate,
//       dimensions: params.dimensions ? params.dimensions.split(',') : [],
//       rowLimit: params.limit ? parseInt(params.limit) : 1000,
//       startRow: 0,
//       searchType: 'web',
//       dataState: 'all',
//       siteUrl: siteUrl,
//     }),
//   });

//   if (!response.ok) {
//     throw new Error(`Google Search Console API error: ${response.status} ${response.statusText}`);
//   }

//   return response.json();
// };

// // Main function to handle different Google Search Console analytics actions
// export const googleSearchConsoleTool = async ({
//   action,
//   timeRange = "last_30d",
//   limit = 10,
//   siteUrl = "",
// }: {
//   action:
//   | "queryPerformance"
//   | "topQueries"
//   | "pagePerformance"
//   | "topPages"
//   | "countryPerformance"
//   | "devicePerformance"
//   | "searchAppearancePerformance"
//   | "queryPerformanceByCountry"
//   | "pagePerformanceByDevice";
//   timeRange?: string;
//   limit?: number;
//   siteUrl?: string;
// }): Promise<string> => {
//   const accessToken = process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN;
//   const defaultSiteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;

//   if (!accessToken) {
//     return "Error: Google Search Console access token not found. Please set GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN in your environment variables.";
//   }

//   if (!siteUrl && !defaultSiteUrl) {
//     return "Error: Google Search Console site URL not found. Please set GOOGLE_SEARCH_CONSOLE_SITE_URL in your environment variables or provide it as a parameter.";
//   }

//   const effectiveSiteUrl = siteUrl || defaultSiteUrl!;

//   // Convert timeRange to actual dates
//   const endDate = new Date();
//   const startDate = new Date();
  
//   if (timeRange === "last_7d") {
//     startDate.setDate(endDate.getDate() - 7);
//   } else if (timeRange === "last_30d") {
//     startDate.setDate(endDate.getDate() - 30);
//   } else if (timeRange === "last_90d") {
//     startDate.setDate(endDate.getDate() - 90);
//   } else if (timeRange === "last_365d") {
//     startDate.setDate(endDate.getDate() - 365);
//   } else {
//     // Default to last 30 days if not specified
//     startDate.setDate(endDate.getDate() - 30);
//   }

//   const formattedStartDate = startDate.toISOString().split('T')[0];
//   const formattedEndDate = endDate.toISOString().split('T')[0];

//   try {
//     switch (action) {
//       case "queryPerformance": {
//         const data = await fetchFromSearchConsole(
//           "sites/" + encodeURIComponent(effectiveSiteUrl) + "/searchAnalytics/query",
//           accessToken,
//           effectiveSiteUrl,
//           {
//             startDate: formattedStartDate,
//             endDate: formattedEndDate,
//             dimensions: "query",
//             limit: limit.toString(),
//           }
//         ) as { rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };

//         if (!data.rows || data.rows.length === 0) {
//           return "No query performance data found for the specified criteria.";
//         }

//         const formattedData = data.rows.map(row => {
//           return `Query: ${row.keys[0]}
// Clicks: ${row.clicks}
// Impressions: ${row.impressions}
// CTR: ${(row.ctr * 100).toFixed(2)}%
// Position: ${row.position.toFixed(2)}`;
//         }).join("\n\n");

//         return `Query Performance (${timeRange}):\n\n${formattedData}`;
//       }

//       case "topQueries": {
//         const data = await fetchFromSearchConsole(
//           "sites/" + encodeURIComponent(effectiveSiteUrl) + "/searchAnalytics/query",
//           accessToken,
//           effectiveSiteUrl,
//           {
//             startDate: formattedStartDate,
//             endDate: formattedEndDate,
//             dimensions: "query",
//             limit: limit.toString(),
//           }
//         ) as { rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };

//         if (!data.rows || data.rows.length === 0) {
//           return "No query performance data found for the specified criteria.";
//         }

//         // Sort by clicks
//         const sortedQueries = [...data.rows].sort((a, b) => b.clicks - a.clicks).slice(0, limit);

//         const formattedData = sortedQueries.map((row, index) => {
//           return `${index + 1}. ${row.keys[0]}
// Clicks: ${row.clicks}
// Impressions: ${row.impressions}
// CTR: ${(row.ctr * 100).toFixed(2)}%
// Position: ${row.position.toFixed(2)}`;
//         }).join("\n\n");

//         return `Top ${limit} Queries by Clicks (${timeRange}):\n\n${formattedData}`;
//       }

//       case "pagePerformance": {
//         const data = await fetchFromSearchConsole(
//           "sites/" + encodeURIComponent(effectiveSiteUrl) + "/searchAnalytics/query",
//           accessToken,
//           effectiveSiteUrl,
//           {
//             startDate: formattedStartDate,
//             endDate: formattedEndDate,
//             dimensions: "page",
//             limit: limit.toString(),
//           }
//         ) as { rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };

//         if (!data.rows || data.rows.length === 0) {
//           return "No page performance data found for the specified criteria.";
//         }

//         const formattedData = data.rows.map(row => {
//           return `Page: ${row.keys[0]}
// Clicks: ${row.clicks}
// Impressions: ${row.impressions}
// CTR: ${(row.ctr * 100).toFixed(2)}%
// Position: ${row.position.toFixed(2)}`;
//         }).join("\n\n");

//         return `Page Performance (${timeRange}):\n\n${formattedData}`;
//       }

//       case "topPages": {
//         const data = await fetchFromSearchConsole(
//           "sites/" + encodeURIComponent(effectiveSiteUrl) + "/searchAnalytics/query",
//           accessToken,
//           effectiveSiteUrl,
//           {
//             startDate: formattedStartDate,
//             endDate: formattedEndDate,
//             dimensions: "page",
//             limit: limit.toString(),
//           }
//         ) as { rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };

//         if (!data.rows || data.rows.length === 0) {
//           return "No page performance data found for the specified criteria.";
//         }

//         // Sort by clicks
//         const sortedPages = [...data.rows].sort((a, b) => b.clicks - a.clicks).slice(0, limit);

//         const formattedData = sortedPages.map((row, index) => {
//           return `${index + 1}. ${row.keys[0]}
// Clicks: ${row.clicks}
// Impressions: ${row.impressions}
// CTR: ${(row.ctr * 100).toFixed(2)}%
// Position: ${row.position.toFixed(2)}`;
//         }).join("\n\n");

//         return `Top ${limit} Pages by Clicks (${timeRange}):\n\n${formattedData}`;
//       }

//       case "countryPerformance": {
//         const data = await fetchFromSearchConsole(
//           "sites/" + encodeURIComponent(effectiveSiteUrl) + "/searchAnalytics/query",
//           accessToken,
//           effectiveSiteUrl,
//           {
//             startDate: formattedStartDate,
//             endDate: formattedEndDate,
//             dimensions: "country",
//             limit: limit.toString(),
//           }
//         ) as { rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };

//         if (!data.rows || data.rows.length === 0) {
//           return "No country performance data found for the specified criteria.";
//         }

//         const formattedData = data.rows.map(row => {
//           return `Country: ${row.keys[0]}
// Clicks: ${row.clicks}
// Impressions: ${row.impressions}
// CTR: ${(row.ctr * 100).toFixed(2)}%
// Position: ${row.position.toFixed(2)}`;
//         }).join("\n\n");

//         return `Country Performance (${timeRange}):\n\n${formattedData}`;
//       }

//       case "devicePerformance": {
//         const data = await fetchFromSearchConsole(
//           "sites/" + encodeURIComponent(effectiveSiteUrl) + "/searchAnalytics/query",
//           accessToken,
//           effectiveSiteUrl,
//           {
//             startDate: formattedStartDate,
//             endDate: formattedEndDate,
//             dimensions: "device",
//             limit: limit.toString(),
//           }
//         ) as { rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };

//         if (!data.rows || data.rows.length === 0) {
//           return "No device performance data found for the specified criteria.";
//         }

//         const formattedData = data.rows.map(row => {
//           return `Device: ${row.keys[0]}
// Clicks: ${row.clicks}
// Impressions: ${row.impressions}
// CTR: ${(row.ctr * 100).toFixed(2)}%
// Position: ${row.position.toFixed(2)}`;
//         }).join("\n\n");

//         return `Device Performance (${timeRange}):\n\n${formattedData}`;
//       }

//       case "searchAppearancePerformance": {
//         const data = await fetchFromSearchConsole(
//           "sites/" + encodeURIComponent(effectiveSiteUrl) + "/searchAnalytics/query",
//           accessToken,
//           effectiveSiteUrl,
//           {
//             startDate: formattedStartDate,
//             endDate: formattedEndDate,
//             dimensions: "searchAppearance",
//             limit: limit.toString(),
//           }
//         ) as { rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };

//         if (!data.rows || data.rows.length === 0) {
//           return "No search appearance performance data found for the specified criteria.";
//         }

//         const formattedData = data.rows.map(row => {
//           return `Search Appearance: ${row.keys[0]}
// Clicks: ${row.clicks}
// Impressions: ${row.impressions}
// CTR: ${(row.ctr * 100).toFixed(2)}%
// Position: ${row.position.toFixed(2)}`;
//         }).join("\n\n");

//         return `Search Appearance Performance (${timeRange}):\n\n${formattedData}`;
//       }

//       case "queryPerformanceByCountry": {
//         const data = await fetchFromSearchConsole(
//           "sites/" + encodeURIComponent(effectiveSiteUrl) + "/searchAnalytics/query",
//           accessToken,
//           effectiveSiteUrl,
//           {
//             startDate: formattedStartDate,
//             endDate: formattedEndDate,
//             dimensions: "query,country",
//             limit: "1000", // Get more data to group by country
//           }
//         ) as { rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };

//         if (!data.rows || data.rows.length === 0) {
//           return "No query performance data by country found for the specified criteria.";
//         }

//         // Group by country
//         const countryMap = new Map<string, {
//           clicks: number;
//           impressions: number;
//           queries: Set<string>;
//         }>();

//         data.rows.forEach(row => {
//           const query = row.keys[0];
//           const country = row.keys[1];
          
//           const existing = countryMap.get(country) || {
//             clicks: 0,
//             impressions: 0,
//             queries: new Set<string>()
//           };

//           countryMap.set(country, {
//             clicks: existing.clicks + row.clicks,
//             impressions: existing.impressions + row.impressions,
//             queries: existing.queries.add(query)
//           });
//         });

//         // Sort countries by clicks
//         const sortedCountries = [...countryMap.entries()]
//           .sort((a, b) => b[1].clicks - a[1].clicks)
//           .slice(0, limit);

//         const formattedData = sortedCountries.map(([country, stats], index) => {
//           const ctr = (stats.clicks / stats.impressions * 100).toFixed(2);
          
//           return `${index + 1}. ${country}
// Clicks: ${stats.clicks}
// Impressions: ${stats.impressions}
// CTR: ${ctr}%
// Unique Queries: ${stats.queries.size}`;
//         }).join("\n\n");

//         return `Query Performance by Country (${timeRange}):\n\n${formattedData}`;
//       }

//       case "pagePerformanceByDevice": {
//         const data = await fetchFromSearchConsole(
//           "sites/" + encodeURIComponent(effectiveSiteUrl) + "/searchAnalytics/query",
//           accessToken,
//           effectiveSiteUrl,
//           {
//             startDate: formattedStartDate,
//             endDate: formattedEndDate,
//             dimensions: "page,device",
//             limit: "1000", // Get more data to group by device
//           }
//         ) as { rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };

//         if (!data.rows || data.rows.length === 0) {
//           return "No page performance data by device found for the specified criteria.";
//         }

//         // Group by device
//         const deviceMap = new Map<string, {
//           clicks: number;
//           impressions: number;
//           pages: Set<string>;
//         }>();

//         data.rows.forEach(row => {
//           const page = row.keys[0];
//           const device = row.keys[1];
          
//           const existing = deviceMap.get(device) || {
//             clicks: 0,
//             impressions: 0,
//             pages: new Set<string>()
//           };

//           deviceMap.set(device, {
//             clicks: existing.clicks + row.clicks,
//             impressions: existing.impressions + row.impressions,
//             pages: existing.pages.add(page)
//           });
//         });

//         // Sort devices by clicks
//         const sortedDevices = [...deviceMap.entries()]
//           .sort((a, b) => b[1].clicks - a[1].clicks)
//           .slice(0, limit);

//         const formattedData = sortedDevices.map(([device, stats], index) => {
//           const ctr = (stats.clicks / stats.impressions * 100).toFixed(2);
          
//           return `${index + 1}. ${device}
// Clicks: ${stats.clicks}
// Impressions: ${stats.impressions}
// CTR: ${ctr}%
// Unique Pages: ${stats.pages.size}`;
//         }).join("\n\n");

//         return `Page Performance by Device (${timeRange}):\n\n${formattedData}`;
//       }

//       default:
//         return `Unsupported action "${action}".`;
//     }
//   } catch (error) {
//     console.error("Google Search Console API error:", error);
//     return `Error fetching data from Google Search Console API: ${error instanceof Error ? error.message : String(error)}`;
//   }
// };

// // Create the LangChain tool
// export const googleSearchConsoleLangTool = new DynamicStructuredTool({
//   name: "googleSearchConsoleTool",
//   description: "Analyze Google Search Console performance metrics including query performance, page performance, country performance, and device performance. Get top performing content by various metrics and performance breakdowns by country and device.",
//   schema: z.object({
//     action: z.enum([
//       "queryPerformance",
//       "topQueries",
//       "pagePerformance",
//       "topPages",
//       "countryPerformance",
//       "devicePerformance",
//       "searchAppearancePerformance",
//       "queryPerformanceByCountry",
//       "pagePerformanceByDevice"
//     ]).describe("The type of analysis to perform"),
//     timeRange: z.string().optional().describe("Time range for the analysis (e.g., 'last_30d', 'last_90d', 'last_7d')"),
//     limit: z.number().optional().describe("Number of results to return (default: 10)"),
//     siteUrl: z.string().optional().describe("Google Search Console site URL (default: from environment variable)"),
//   }),
//   func: googleSearchConsoleTool,
// }); 
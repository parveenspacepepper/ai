import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

// Define types for Google Analytics API responses
// interface GoogleAnalyticsPageView {
//   pagePath: string;
//   pageTitle: string;
//   metrics: {
//     pageviews: number;
//     uniquePageviews: number;
//     averageTimeOnPage: number;
//     bounceRate: number;
//     exitRate: number;
//   };
// }

// interface GoogleAnalyticsUserBehavior {
//   date: string;
//   metrics: {
//     users: number;
//     newUsers: number;
//     sessions: number;
//     sessionsPerUser: number;
//     averageSessionDuration: number;
//     bounceRate: number;
//   };
// }

// interface GoogleAnalyticsConversion {
//   conversionName: string;
//   metrics: {
//     conversions: number;
//     conversionRate: number;
//     conversionValue: number;
//     revenue: number;
//   };
// }

// interface GoogleAnalyticsTrafficSource {
//   source: string;
//   medium: string;
//   metrics: {
//     sessions: number;
//     users: number;
//     newUsers: number;
//     bounceRate: number;
//     averageSessionDuration: number;
//     conversionRate: number;
//   };
// }

const fetchFromGoogleAnalytics = async (
  endpoint: string,
  accessToken: string,
  viewId: string,
  params: Record<string, string> = {}
): Promise<unknown> => {
  const baseUrl = "https://analyticsdata.googleapis.com/v1beta";
  const queryParams = new URLSearchParams({
    ...params,
  });

  const response = await fetch(`${baseUrl}${endpoint}?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Google Analytics API error: ${response.statusText}`);
  }

  return response.json();
};

export const googleAnalyticsTool = new DynamicStructuredTool({
  name: "google_analytics",
  description: "Tool for fetching and analyzing Google Analytics data",
  schema: z.object({
    action: z.enum([
      "pageViews",
      "userBehavior",
      "conversions",
      "trafficSources",
    ]),
    timeRange: z.string().optional().default("last_30d"),
    limit: z.number().optional().default(10),
    viewId: z.string().optional(),
  }),
  func: async ({ action, timeRange = "last_30d", limit = 10, viewId = "" }) => {
    const accessToken = process.env.GOOGLE_ANALYTICS_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("Google Analytics access token not found");
    }

    if (!viewId) {
      viewId = process.env.GOOGLE_ANALYTICS_VIEW_ID || "";
      if (!viewId) {
        throw new Error("Google Analytics view ID not found");
      }
    }

    try {
      switch (action) {
        case "pageViews": {
          const data = await fetchFromGoogleAnalytics(
            "/properties:runReport",
            accessToken,
            viewId,
            {
              dimensions: "pagePath,pageTitle",
              metrics: "pageviews,uniquePageviews,averageTimeOnPage,bounceRate,exitRate",
              dateRange: timeRange,
              limit: limit.toString(),
            }
          );
          return JSON.stringify(data);
        }

        case "userBehavior": {
          const data = await fetchFromGoogleAnalytics(
            "/properties:runReport",
            accessToken,
            viewId,
            {
              dimensions: "date",
              metrics: "users,newUsers,sessions,sessionsPerUser,averageSessionDuration,bounceRate",
              dateRange: timeRange,
              limit: limit.toString(),
            }
          );
          return JSON.stringify(data);
        }

        case "conversions": {
          const data = await fetchFromGoogleAnalytics(
            "/properties:runReport",
            accessToken,
            viewId,
            {
              dimensions: "conversionName",
              metrics: "conversions,conversionRate,conversionValue,revenue",
              dateRange: timeRange,
              limit: limit.toString(),
            }
          );
          return JSON.stringify(data);
        }

        case "trafficSources": {
          const data = await fetchFromGoogleAnalytics(
            "/properties:runReport",
            accessToken,
            viewId,
            {
              dimensions: "source,medium",
              metrics: "sessions,users,newUsers,bounceRate,averageSessionDuration,conversionRate",
              dateRange: timeRange,
              limit: limit.toString(),
            }
          );
          return JSON.stringify(data);
        }

        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      console.error("Error fetching Google Analytics data:", error);
      throw error;
    }
  },
}); 
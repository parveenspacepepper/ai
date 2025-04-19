import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { getValidAccessToken } from "../metaAuth";

// Define types for Meta API responses
interface MetaAdPerformance {
  id: string;
  name: string;
  campaign?: {
    name: string;
  };
  adset?: {
    name: string;
  };
  insights?: Array<{
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
    cpc: number;
    conversions: number;
    conversion_rate: number;
    region: string;
    start_time: string;
    end_time: string;
  }>;
}

interface MetaPostPerformance {
  post_id: string;
  post_type: string;
  message?: string;
  created_time: string;
  insights?: Array<{
    post_impressions: number;
    post_engaged_users: number;
    post_reactions_by_type: Record<string, number>;
    post_shares: number;
    region: string;
  }>;
}

// interface MetaPageInsights {
//   page_id: string;
//   page_name: string;
//   followers: number;
//   page_views: number;
//   page_impressions: number;
//   page_engaged_users: number;
//   page_actions: number;
//   period: string;
// }

// interface MetaAudienceInsights {
//   region: string;
//   age_groups: Record<string, number>;
//   gender: Record<string, number>;
//   interests: Record<string, number>;
//   period: string;
// }

// Function to fetch data from Meta Graph API
export async function fetchFromMeta(
  endpoint: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const baseUrl = "https://graph.facebook.com/v18.0";
  const queryParams = new URLSearchParams({
    access_token: accessToken,
    ...params,
  });

  const response = await fetch(`${baseUrl}/${endpoint}?${queryParams.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch from Meta API: ${response.statusText}`);
  }

  return response.json();
}

// Main function to handle different Meta analytics actions
export const metaAnalyticsTool = new DynamicStructuredTool({
  name: "meta_analytics",
  description: "Fetch analytics data from Meta (Facebook) API. Use this tool to get ad performance, post performance, page insights, and audience insights.",
  schema: z.object({
    action: z.enum(["ad_performance", "post_performance", "page_insights", "audience_insights"]),
    pageId: z.string().optional(),
    postId: z.string().optional(),
    adId: z.string().optional(),
    dateRange: z.string().optional(),
  }),
  func: async ({ action, dateRange }) => {
    try {
      // Get a valid access token
      const accessToken = await getValidAccessToken();
      
      switch (action) {
        case "ad_performance": {
          const adPerformanceResponse = await fetchFromMeta(
            "me/ads",
            accessToken,
            {
              fields: "id,name,campaign{name},adset{name},insights{impressions,clicks,spend,ctr,cpc,conversions,conversion_rate,region,start_time,end_time}",
              limit: "10",
              time_range: JSON.stringify({ since: dateRange }),
            }
          ) as { data: MetaAdPerformance[] };

          if (!adPerformanceResponse.data || adPerformanceResponse.data.length === 0) {
            return "No ad performance data found for the specified criteria.";
          }

          const formattedData = adPerformanceResponse.data.map(ad => {
            const insights = ad.insights?.[0] || {
              impressions: 0,
              clicks: 0,
              spend: 0,
              ctr: 0,
              cpc: 0,
              conversions: 0,
              conversion_rate: 0,
              start_time: 'N/A',
              end_time: 'N/A'
            };
            return `Ad: ${ad.name}
Campaign: ${ad.campaign?.name || 'N/A'}
Ad Set: ${ad.adset?.name || 'N/A'}
Impressions: ${insights.impressions}
Clicks: ${insights.clicks}
CTR: ${insights.ctr.toFixed(2)}%
CPC: $${insights.cpc.toFixed(2)}
Conversions: ${insights.conversions}
Conversion Rate: ${insights.conversion_rate.toFixed(2)}%
Spend: $${insights.spend.toFixed(2)}
Period: ${insights.start_time} to ${insights.end_time}`;
          }).join("\n\n");

          return `Ad Performance (${dateRange}):\n\n${formattedData}`;
        }

        case "post_performance": {
          const postPerformanceResponse = await fetchFromMeta(
            "me/posts",
            accessToken,
            {
              fields: "id,message,created_time,insights{post_impressions,post_engaged_users,post_reactions_by_type,post_shares,region}",
              limit: "10",
              time_range: JSON.stringify({ since: dateRange }),
            }
          ) as { data: MetaPostPerformance[] };

          if (!postPerformanceResponse.data || postPerformanceResponse.data.length === 0) {
            return "No post performance data found for the specified criteria.";
          }

          const formattedData = postPerformanceResponse.data.map(post => {
            const insights = post.insights?.[0] || {
              post_impressions: 0,
              post_engaged_users: 0,
              post_reactions_by_type: {},
              post_shares: 0
            };
            const reactions = insights.post_reactions_by_type || {};
            const totalReactions = Object.values(reactions as Record<string, number>).reduce((sum: number, count: number) => sum + count, 0);

            return `Post ID: ${post.post_id}
Created: ${post.created_time}
Message: ${post.message?.substring(0, 100)}${post.message && post.message.length > 100 ? '...' : ''}
Impressions: ${insights.post_impressions}
Engaged Users: ${insights.post_engaged_users}
Reactions: ${totalReactions}
Shares: ${insights.post_shares}`;
          }).join("\n\n");

          return `Post Performance (${dateRange}):\n\n${formattedData}`;
        }

        case "page_insights": {
          const pagePerformanceResponse = await fetchFromMeta(
            "me",
            accessToken,
            {
              fields: "id,name,insights{period,values{name,value}}",
              metric: "page_impressions,page_engaged_users,page_actions,page_views",
              period: dateRange || "1d",
            }
          ) as { id: string; name: string; insights: { data: { period: string; values: { name: string; value: number }[] }[] } };

          if (!pagePerformanceResponse.insights?.data || pagePerformanceResponse.insights.data.length === 0) {
            return "No page insights data found for the specified criteria.";
          }

          const insights = pagePerformanceResponse.insights.data[0];
          const metrics = insights.values.reduce((acc, metric) => {
            acc[metric.name] = metric.value;
            return acc;
          }, {} as Record<string, number>);

          return `Page Insights for ${pagePerformanceResponse.name} (${insights.period}):
Page Impressions: ${metrics.page_impressions || 0}
Page Engaged Users: ${metrics.page_engaged_users || 0}
Page Actions: ${metrics.page_actions || 0}
Page Views: ${metrics.page_views || 0}`;
        }

        case "audience_insights": {
          const audienceResponse = await fetchFromMeta(
            "me/insights",
            accessToken,
            {
              metric: "audience_city,audience_country,audience_gender_age,audience_interest",
              period: dateRange || "1d",
            }
          ) as { data: { name: string; period: string; values: { value: Record<string, number> }[] }[] };

          if (!audienceResponse.data || audienceResponse.data.length === 0) {
            return "No audience insights data found for the specified criteria.";
          }

          const formattedData = audienceResponse.data.map(insight => {
            const values = insight.values[0]?.value || {};

            if (insight.name === "audience_gender_age") {
              const genderAgeData = Object.entries(values)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([key, value]) => `${key}: ${value}%`)
                .join("\n");

              return `Gender and Age Distribution (${insight.period}):\n${genderAgeData}`;
            } else if (insight.name === "audience_interest") {
              const interestData = Object.entries(values)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([key, value]) => `${key}: ${value}%`)
                .join("\n");

              return `Top Interests (${insight.period}):\n${interestData}`;
            } else {
              const locationData = Object.entries(values)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([key, value]) => `${key}: ${value}%`)
                .join("\n");

              return `Top Locations (${insight.period}):\n${locationData}`;
            }
          }).join("\n\n");

          return `Audience Insights (${dateRange}):\n\n${formattedData}`;
        }

        default:
          return `Unsupported action "${action}".`;
      }
    } catch (error) {
      console.error("Error in meta analytics tool:", error);
      throw error;
    }
  },
}); 
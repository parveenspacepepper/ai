import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

// Define types for Google Ads API responses
interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  metrics?: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversionValue: number;
    ctr: number;
    averageCpc: number;
    conversionRate: number;
    costPerConversion: number;
    roas: number;
    startDate: string;
    endDate: string;
  };
}

interface GoogleAdsAdGroup {
  id: string;
  name: string;
  campaignId: string;
  campaignName: string;
  status: string;
  metrics?: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversionValue: number;
    ctr: number;
    averageCpc: number;
    conversionRate: number;
    costPerConversion: number;
    roas: number;
  };
}

interface GoogleAdsKeyword {
  id: string;
  text: string;
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  campaignName: string;
  status: string;
  matchType: string;
  metrics?: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversionValue: number;
    ctr: number;
    averageCpc: number;
    conversionRate: number;
    costPerConversion: number;
    roas: number;
  };
}

interface GoogleAdsAudienceInsights {
  audienceId: string;
  audienceName: string;
  metrics?: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversionValue: number;
    ctr: number;
    averageCpc: number;
    conversionRate: number;
    costPerConversion: number;
    roas: number;
  };
}

interface KeywordMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  averageCpc: number;
  conversionRate: number;
  costPerConversion: number;
  roas: number;
}

// Function to fetch data from Google Ads API
const fetchFromGoogleAds = async (
  endpoint: string,
  accessToken: string,
  customerId: string,
  params: Record<string, string> = {}
): Promise<unknown> => {
  const baseUrl = "https://googleads.googleapis.com/v14";
  const queryParams = new URLSearchParams({
    access_token: accessToken,
    ...params,
  });

  const url = `${baseUrl}/${endpoint}?${queryParams.toString()}`;
  const response = await fetch(url, {
    headers: {
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      "login-customer-id": customerId,
    },
  });

  if (!response.ok) {
    throw new Error(`Google Ads API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

// Main function to handle different Google Ads analytics actions
export const googleAdsTool = async ({
  action,
  timeRange = "last_30d",
  limit = 10,
  customerId = "",
}: {
  action:
  | "campaignPerformance"
  | "topCampaigns"
  | "adGroupPerformance"
  | "topAdGroups"
  | "keywordPerformance"
  | "topKeywords"
  | "audienceInsights"
  | "campaignPerformanceByDevice"
  | "keywordPerformanceByMatchType";
  timeRange?: string;
  limit?: number;
  customerId?: string;
}): Promise<string> => {
  const accessToken = process.env.GOOGLE_ADS_ACCESS_TOKEN;
  const defaultCustomerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

  if (!accessToken) {
    return "Error: Google Ads access token not found. Please set GOOGLE_ADS_ACCESS_TOKEN in your environment variables.";
  }

  if (!customerId && !defaultCustomerId) {
    return "Error: Google Ads customer ID not found. Please set GOOGLE_ADS_CUSTOMER_ID in your environment variables or provide it as a parameter.";
  }

  const effectiveCustomerId = customerId || defaultCustomerId!;

  try {
    switch (action) {
      case "campaignPerformance": {
        const data = await fetchFromGoogleAds(
          `customers/${effectiveCustomerId}/googleAds:search`,
          accessToken,
          effectiveCustomerId,
          {
            query: `
              SELECT 
                campaign.id,
                campaign.name,
                campaign.status,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value,
                metrics.ctr,
                metrics.average_cpc,
                metrics.cost_per_conversion,
                metrics.roas,
                segments.date
              FROM campaign
              WHERE segments.date DURING ${timeRange}
              ORDER BY metrics.impressions DESC
              LIMIT ${limit}
            `,
          }
        ) as { results: GoogleAdsCampaign[] };

        if (!data.results || data.results.length === 0) {
          return "No campaign performance data found for the specified criteria.";
        }

        const formattedData = data.results.map(campaign => {
          const metrics = campaign.metrics || {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionValue: 0,
            ctr: 0,
            averageCpc: 0,
            conversionRate: 0,
            costPerConversion: 0,
            roas: 0,
            startDate: 'N/A',
            endDate: 'N/A'
          };
          return `Campaign: ${campaign.name}
Status: ${campaign.status}
Impressions: ${metrics.impressions}
Clicks: ${metrics.clicks}
CTR: ${metrics.ctr.toFixed(2)}%
CPC: $${(metrics.averageCpc / 1000000).toFixed(2)}
Conversions: ${metrics.conversions}
Conversion Rate: ${metrics.conversionRate.toFixed(2)}%
Cost per Conversion: $${(metrics.costPerConversion / 1000000).toFixed(2)}
ROAS: ${metrics.roas.toFixed(2)}
Spend: $${(metrics.cost / 1000000).toFixed(2)}
Period: ${metrics.startDate} to ${metrics.endDate}`;
        }).join("\n\n");

        return `Campaign Performance (${timeRange}):\n\n${formattedData}`;
      }

      case "topCampaigns": {
        const data = await fetchFromGoogleAds(
          `customers/${effectiveCustomerId}/googleAds:search`,
          accessToken,
          effectiveCustomerId,
          {
            query: `
              SELECT 
                campaign.id,
                campaign.name,
                campaign.status,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value,
                metrics.ctr,
                metrics.average_cpc,
                metrics.cost_per_conversion,
                metrics.roas,
                segments.date
              FROM campaign
              WHERE segments.date DURING ${timeRange}
              ORDER BY metrics.conversions DESC
              LIMIT ${limit}
            `,
          }
        ) as { results: GoogleAdsCampaign[] };

        if (!data.results || data.results.length === 0) {
          return "No campaign performance data found for the specified criteria.";
        }

        const formattedData = data.results.map((campaign, index) => {
          const metrics = campaign.metrics || {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionValue: 0,
            ctr: 0,
            averageCpc: 0,
            conversionRate: 0,
            costPerConversion: 0,
            roas: 0,
            startDate: 'N/A',
            endDate: 'N/A'
          };
          return `${index + 1}. ${campaign.name}
Status: ${campaign.status}
Conversions: ${metrics.conversions}
CTR: ${metrics.ctr.toFixed(2)}%
Spend: $${(metrics.cost / 1000000).toFixed(2)}
ROAS: ${metrics.roas.toFixed(2)}`;
        }).join("\n\n");

        return `Top ${limit} Campaigns by Conversions (${timeRange}):\n\n${formattedData}`;
      }

      case "adGroupPerformance": {
        const data = await fetchFromGoogleAds(
          `customers/${effectiveCustomerId}/googleAds:search`,
          accessToken,
          effectiveCustomerId,
          {
            query: `
              SELECT 
                ad_group.id,
                ad_group.name,
                campaign.id,
                campaign.name,
                ad_group.status,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value,
                metrics.ctr,
                metrics.average_cpc,
                metrics.cost_per_conversion,
                metrics.roas,
                segments.date
              FROM ad_group
              WHERE segments.date DURING ${timeRange}
              ORDER BY metrics.impressions DESC
              LIMIT ${limit}
            `,
          }
        ) as { results: GoogleAdsAdGroup[] };

        if (!data.results || data.results.length === 0) {
          return "No ad group performance data found for the specified criteria.";
        }

        const formattedData = data.results.map(adGroup => {
          const metrics = adGroup.metrics || {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionValue: 0,
            ctr: 0,
            averageCpc: 0,
            conversionRate: 0,
            costPerConversion: 0,
            roas: 0
          };
          return `Ad Group: ${adGroup.name}
Campaign: ${adGroup.campaignName}
Status: ${adGroup.status}
Impressions: ${metrics.impressions}
Clicks: ${metrics.clicks}
CTR: ${metrics.ctr.toFixed(2)}%
CPC: $${(metrics.averageCpc / 1000000).toFixed(2)}
Conversions: ${metrics.conversions}
Conversion Rate: ${metrics.conversionRate.toFixed(2)}%
Cost per Conversion: $${(metrics.costPerConversion / 1000000).toFixed(2)}
ROAS: ${metrics.roas.toFixed(2)}
Spend: $${(metrics.cost / 1000000).toFixed(2)}`;
        }).join("\n\n");

        return `Ad Group Performance (${timeRange}):\n\n${formattedData}`;
      }

      case "topAdGroups": {
        const data = await fetchFromGoogleAds(
          `customers/${effectiveCustomerId}/googleAds:search`,
          accessToken,
          effectiveCustomerId,
          {
            query: `
              SELECT 
                ad_group.id,
                ad_group.name,
                campaign.id,
                campaign.name,
                ad_group.status,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value,
                metrics.ctr,
                metrics.average_cpc,
                metrics.cost_per_conversion,
                metrics.roas,
                segments.date
              FROM ad_group
              WHERE segments.date DURING ${timeRange}
              ORDER BY metrics.conversions DESC
              LIMIT ${limit}
            `,
          }
        ) as { results: GoogleAdsAdGroup[] };

        if (!data.results || data.results.length === 0) {
          return "No ad group performance data found for the specified criteria.";
        }

        const formattedData = data.results.map((adGroup, index) => {
          const metrics = adGroup.metrics || {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionValue: 0,
            ctr: 0,
            averageCpc: 0,
            conversionRate: 0,
            costPerConversion: 0,
            roas: 0
          };
          return `${index + 1}. ${adGroup.name}
Campaign: ${adGroup.campaignName}
Status: ${adGroup.status}
Conversions: ${metrics.conversions}
CTR: ${metrics.ctr.toFixed(2)}%
Spend: $${(metrics.cost / 1000000).toFixed(2)}
ROAS: ${metrics.roas.toFixed(2)}`;
        }).join("\n\n");

        return `Top ${limit} Ad Groups by Conversions (${timeRange}):\n\n${formattedData}`;
      }

      case "keywordPerformance": {
        const data = await fetchFromGoogleAds(
          `customers/${effectiveCustomerId}/googleAds:search`,
          accessToken,
          effectiveCustomerId,
          {
            query: `
              SELECT 
                ad_group_criterion.criterion_id,
                ad_group_criterion.keyword.text,
                ad_group.id,
                ad_group.name,
                campaign.id,
                campaign.name,
                ad_group_criterion.status,
                ad_group_criterion.keyword.match_type,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value,
                metrics.ctr,
                metrics.average_cpc,
                metrics.cost_per_conversion,
                metrics.roas,
                segments.date
              FROM keyword_view
              WHERE segments.date DURING ${timeRange}
              ORDER BY metrics.impressions DESC
              LIMIT ${limit}
            `,
          }
        ) as { results: GoogleAdsKeyword[] };

        if (!data.results || data.results.length === 0) {
          return "No keyword performance data found for the specified criteria.";
        }

        const formattedData = data.results.map(keyword => {
          const metrics = keyword.metrics || {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionValue: 0,
            ctr: 0,
            averageCpc: 0,
            conversionRate: 0,
            costPerConversion: 0,
            roas: 0
          };
          return `Keyword: ${keyword.text}
Match Type: ${keyword.matchType}
Ad Group: ${keyword.adGroupName}
Campaign: ${keyword.campaignName}
Status: ${keyword.status}
Impressions: ${metrics.impressions}
Clicks: ${metrics.clicks}
CTR: ${metrics.ctr.toFixed(2)}%
CPC: $${(metrics.averageCpc / 1000000).toFixed(2)}
Conversions: ${metrics.conversions}
Conversion Rate: ${metrics.conversionRate.toFixed(2)}%
Cost per Conversion: $${(metrics.costPerConversion / 1000000).toFixed(2)}
ROAS: ${metrics.roas.toFixed(2)}
Spend: $${(metrics.cost / 1000000).toFixed(2)}`;
        }).join("\n\n");

        return `Keyword Performance (${timeRange}):\n\n${formattedData}`;
      }

      case "topKeywords": {
        const data = await fetchFromGoogleAds(
          `customers/${effectiveCustomerId}/googleAds:search`,
          accessToken,
          effectiveCustomerId,
          {
            query: `
              SELECT 
                ad_group_criterion.criterion_id,
                ad_group_criterion.keyword.text,
                ad_group.id,
                ad_group.name,
                campaign.id,
                campaign.name,
                ad_group_criterion.status,
                ad_group_criterion.keyword.match_type,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value,
                metrics.ctr,
                metrics.average_cpc,
                metrics.cost_per_conversion,
                metrics.roas,
                segments.date
              FROM keyword_view
              WHERE segments.date DURING ${timeRange}
              ORDER BY metrics.conversions DESC
              LIMIT ${limit}
            `,
          }
        ) as { results: GoogleAdsKeyword[] };

        if (!data.results || data.results.length === 0) {
          return "No keyword performance data found for the specified criteria.";
        }

        const formattedData = data.results.map((keyword, index) => {
          const metrics = keyword.metrics || {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionValue: 0,
            ctr: 0,
            averageCpc: 0,
            conversionRate: 0,
            costPerConversion: 0,
            roas: 0
          };
          return `${index + 1}. ${keyword.text}
Match Type: ${keyword.matchType}
Ad Group: ${keyword.adGroupName}
Campaign: ${keyword.campaignName}
Status: ${keyword.status}
Conversions: ${metrics.conversions}
CTR: ${metrics.ctr.toFixed(2)}%
Spend: $${(metrics.cost / 1000000).toFixed(2)}
ROAS: ${metrics.roas.toFixed(2)}`;
        }).join("\n\n");

        return `Top ${limit} Keywords by Conversions (${timeRange}):\n\n${formattedData}`;
      }

      case "audienceInsights": {
        const data = await fetchFromGoogleAds(
          `customers/${effectiveCustomerId}/googleAds:search`,
          accessToken,
          effectiveCustomerId,
          {
            query: `
              SELECT 
                audience.id,
                audience.name,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value,
                metrics.ctr,
                metrics.average_cpc,
                metrics.cost_per_conversion,
                metrics.roas,
                segments.date
              FROM audience
              WHERE segments.date DURING ${timeRange}
              ORDER BY metrics.impressions DESC
              LIMIT ${limit}
            `,
          }
        ) as { results: GoogleAdsAudienceInsights[] };

        if (!data.results || data.results.length === 0) {
          return "No audience insights data found for the specified criteria.";
        }

        const formattedData = data.results.map(audience => {
          const metrics = audience.metrics || {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionValue: 0,
            ctr: 0,
            averageCpc: 0,
            conversionRate: 0,
            costPerConversion: 0,
            roas: 0
          };
          return `Audience: ${audience.audienceName}
Impressions: ${metrics.impressions}
Clicks: ${metrics.clicks}
CTR: ${metrics.ctr.toFixed(2)}%
CPC: $${(metrics.averageCpc / 1000000).toFixed(2)}
Conversions: ${metrics.conversions}
Conversion Rate: ${metrics.conversionRate.toFixed(2)}%
Cost per Conversion: $${(metrics.costPerConversion / 1000000).toFixed(2)}
ROAS: ${metrics.roas.toFixed(2)}
Spend: $${(metrics.cost / 1000000).toFixed(2)}`;
        }).join("\n\n");

        return `Audience Insights (${timeRange}):\n\n${formattedData}`;
      }

      case "campaignPerformanceByDevice": {
        const data = await fetchFromGoogleAds(
          `customers/${effectiveCustomerId}/googleAds:search`,
          accessToken,
          effectiveCustomerId,
          {
            query: `
              SELECT 
                campaign.id,
                campaign.name,
                segments.device,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value,
                metrics.ctr,
                metrics.average_cpc,
                metrics.cost_per_conversion,
                metrics.roas,
                segments.date
              FROM campaign
              WHERE segments.date DURING ${timeRange}
              ORDER BY metrics.impressions DESC
            `,
          }
        ) as { results: Array<GoogleAdsCampaign & { segments: { device: string } }> };

        if (!data.results || data.results.length === 0) {
          return "No campaign performance data by device found for the specified criteria.";
        }

        // Group by device
        const deviceMap = new Map<string, {
          impressions: number;
          clicks: number;
          cost: number;
          conversions: number;
          conversionValue: number;
          campaignCount: number;
        }>();

        data.results.forEach(campaign => {
          const metrics = campaign.metrics || {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionValue: 0,
            ctr: 0,
            averageCpc: 0,
            conversionRate: 0,
            costPerConversion: 0,
            roas: 0,
            startDate: 'N/A',
            endDate: 'N/A'
          };
          const device = campaign.segments?.device || 'UNKNOWN';

          const existing = deviceMap.get(device) || {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionValue: 0,
            campaignCount: 0
          };

          deviceMap.set(device, {
            impressions: existing.impressions + metrics.impressions,
            clicks: existing.clicks + metrics.clicks,
            cost: existing.cost + metrics.cost,
            conversions: existing.conversions + metrics.conversions,
            conversionValue: existing.conversionValue + metrics.conversionValue,
            campaignCount: existing.campaignCount + 1
          });
        });

        // Sort devices by conversions
        const sortedDevices = [...deviceMap.entries()]
          .sort((a, b) => b[1].conversions - a[1].conversions)
          .slice(0, limit);

        const formattedData = sortedDevices.map(([device, stats], index) => {
          const ctr = (stats.clicks / stats.impressions * 100).toFixed(2);
          const cpc = (stats.cost / stats.clicks / 1000000).toFixed(2);
          const conversionRate = (stats.conversions / stats.clicks * 100).toFixed(2);
          const roas = (stats.conversionValue / stats.cost).toFixed(2);

          return `${index + 1}. ${device}
Impressions: ${stats.impressions}
Clicks: ${stats.clicks}
CTR: ${ctr}%
CPC: $${cpc}
Conversions: ${stats.conversions}
Conversion Rate: ${conversionRate}%
ROAS: ${roas}
Spend: $${(stats.cost / 1000000).toFixed(2)}
Campaigns: ${stats.campaignCount}`;
        }).join("\n\n");

        return `Campaign Performance by Device (${timeRange}):\n\n${formattedData}`;
      }

      case "keywordPerformanceByMatchType": {
        const data = await fetchFromGoogleAds(
          `customers/${effectiveCustomerId}/googleAds:search`,
          accessToken,
          effectiveCustomerId,
          {
            query: `
              SELECT 
                ad_group_criterion.keyword.match_type,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value,
                metrics.ctr,
                metrics.average_cpc,
                metrics.cost_per_conversion,
                metrics.roas,
                segments.date
              FROM keyword_view
              WHERE segments.date DURING ${timeRange}
              ORDER BY metrics.impressions DESC
            `,
          }
        ) as { results: Array<{ ad_group_criterion: { keyword: { match_type: string } } } & { metrics?: KeywordMetrics }> };

        if (!data.results || data.results.length === 0) {
          return "No keyword performance data by match type found for the specified criteria.";
        }

        // Group by match type
        const matchTypeMap = new Map<string, {
          impressions: number;
          clicks: number;
          cost: number;
          conversions: number;
          conversionValue: number;
          keywordCount: number;
        }>();

        data.results.forEach(keyword => {
          const metrics = keyword.metrics || {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionValue: 0,
            ctr: 0,
            averageCpc: 0,
            conversionRate: 0,
            costPerConversion: 0,
            roas: 0
          };
          const matchType = keyword.ad_group_criterion?.keyword?.match_type || 'UNKNOWN';

          const existing = matchTypeMap.get(matchType) || {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionValue: 0,
            keywordCount: 0
          };

          matchTypeMap.set(matchType, {
            impressions: existing.impressions + metrics.impressions,
            clicks: existing.clicks + metrics.clicks,
            cost: existing.cost + metrics.cost,
            conversions: existing.conversions + metrics.conversions,
            conversionValue: existing.conversionValue + metrics.conversionValue,
            keywordCount: existing.keywordCount + 1
          });
        });

        // Sort match types by conversions
        const sortedMatchTypes = [...matchTypeMap.entries()]
          .sort((a, b) => b[1].conversions - a[1].conversions)
          .slice(0, limit);

        const formattedData = sortedMatchTypes.map(([matchType, stats], index) => {
          const ctr = (stats.clicks / stats.impressions * 100).toFixed(2);
          const cpc = (stats.cost / stats.clicks / 1000000).toFixed(2);
          const conversionRate = (stats.conversions / stats.clicks * 100).toFixed(2);
          const roas = (stats.conversionValue / stats.cost).toFixed(2);

          return `${index + 1}. ${matchType}
Impressions: ${stats.impressions}
Clicks: ${stats.clicks}
CTR: ${ctr}%
CPC: $${cpc}
Conversions: ${stats.conversions}
Conversion Rate: ${conversionRate}%
ROAS: ${roas}
Spend: $${(stats.cost / 1000000).toFixed(2)}
Keywords: ${stats.keywordCount}`;
        }).join("\n\n");

        return `Keyword Performance by Match Type (${timeRange}):\n\n${formattedData}`;
      }

      default:
        return `Unsupported action "${action}".`;
    }
  } catch (error) {
    console.error("Google Ads API error:", error);
    return `Error fetching data from Google Ads API: ${error instanceof Error ? error.message : String(error)}`;
  }
};

// Create the LangChain tool
export const googleAdsLangTool = new DynamicStructuredTool({
  name: "googleAdsTool",
  description: "Analyze Google Ads performance metrics including campaign performance, ad group performance, keyword performance, and audience insights. Get top performing content by various metrics and performance breakdowns by device and match type.",
  schema: z.object({
    action: z.enum([
      "campaignPerformance",
      "topCampaigns",
      "adGroupPerformance",
      "topAdGroups",
      "keywordPerformance",
      "topKeywords",
      "audienceInsights",
      "campaignPerformanceByDevice",
      "keywordPerformanceByMatchType"
    ]).describe("The type of analysis to perform"),
    timeRange: z.string().optional().describe("Time range for the analysis (e.g., 'last_30d', 'last_90d', 'last_7d')"),
    limit: z.number().optional().describe("Number of results to return (default: 10)"),
    customerId: z.string().optional().describe("Google Ads customer ID (default: from environment variable)"),
  }),
  func: googleAdsTool,
}); 
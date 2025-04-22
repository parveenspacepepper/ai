import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { getValidAccessToken } from "../metaAuth";

// Define types for Meta API responses
interface MetaAdPerformance {
  id: string;
  name: string;
  campaign?: {
    id: string;
    name: string;
    objective: string;
    status: string;
  };
  adset?: {
    id: string;
    name: string;
    targeting: {
      age_min: number;
      age_max: number;
      genders: number[];
      geo_locations: {
        countries: string[];
      };
      interests: string[];
    };
    status: string;
  };
  creative?: {
    id: string;
    title: string;
    body: string;
    image_url: string;
    video_id?: string;
    duration_sec?: number;
    frame_rate?: number;
    resolution?: string;
    aspect_ratio?: string;
    sound_type?: string;
    language?: string;
    creative_format?: string;
    production_elements?: string[];
    core_elements_highlighted?: string[];
    ad_objective?: string;
    cta_type?: string;
    funnel_stage?: string;
    target_persona?: string;
    audience_traits?: string[];
    distribution_channel?: string;
  };
  insights?: Array<{
    // Basic Metrics
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
    cpc: number;
    conversions: number;
    conversion_rate: number;
    reach: number;
    frequency: number;
    unique_clicks: number;
    
    // Video Performance Metrics
    video_views: number;
    video_30_sec_watched_views: number;
    video_p25_watched_actions: number;
    video_p50_watched_actions: number;
    video_p75_watched_actions: number;
    video_p95_watched_actions: number;
    video_p100_watched_actions: number;
    video_avg_time_watched_actions: number;
    view_duration_avg: number;
    audience_retention_curve: number[];
    
    // Engagement Metrics
    social_impressions: number;
    social_clicks: number;
    social_spend: number;
    inline_link_clicks: number;
    inline_post_engagement: number;
    engagement_rate: number;
    save_rate: number;
    bounce_rate: number;
    return_viewers: number;
    
    // Audience Insights
    best_performing_region: string;
    audience_retention: {
      age_groups: Record<string, number>;
      gender: Record<string, number>;
      interests: Record<string, number>;
    };
    
    // Performance Analysis
    outcome_vs_expected: number;
    prediction_confidence_at_launch: number;
    causal_inference_score: number;
    model_version_used: string;
    experiment_batch_id?: string;
    tag_correlation_delta: number;
    
    // Time Period
    region: string;
    start_time: string;
    end_time: string;
  }>;
  effective_status: string;
  status: string;
  created_time: string;
  updated_time: string;
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

// Add proper interface for the response data
interface MetaApiResponse<T> {
  data: T[];
}

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
  description: "Fetch analytics data from Meta (Facebook) API. Use this tool to get ad performance, campaign performance, ad set performance, and audience insights.",
  schema: z.object({
    action: z.enum([
      "ad_performance",
      "campaign_performance",
      "adset_performance",
      "post_performance",
      "page_insights",
      "audience_insights",
      "active_ads"
    ]),
    dateRange: z.string().optional().default("today"),
    fields: z.string().optional(),
    limit: z.number().optional(),
  }),
  func: async ({ action, dateRange = "today", fields, limit }) => {
    try {
      const accessToken = await getValidAccessToken();
      const pageId = process.env.META_PAGE_ID;
      
      if (!pageId) {
        throw new Error("Meta page ID not configured in environment variables");
      }

      // Handle date range
      let timeRange;
      if (dateRange === "today") {
        const today = new Date().toISOString().split('T')[0];
        timeRange = JSON.stringify({ since: today });
      } else {
        timeRange = JSON.stringify({ since: dateRange });
      }

      // Default fields if none specified
      const defaultFields = {
        ad_performance: "id,name,status,effective_status,campaign{id,name,objective,status},adset{id,name,targeting,status},creative{id,title,body,image_url,video_id,duration_sec,frame_rate,resolution,aspect_ratio,sound_type,language,creative_format,production_elements,core_elements_highlighted,ad_objective,cta_type,funnel_stage,target_persona,audience_traits,distribution_channel},insights{impressions,clicks,spend,ctr,cpc,conversions,conversion_rate,reach,frequency,unique_clicks,video_views,video_30_sec_watched_views,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions,video_avg_time_watched_actions,social_impressions,social_clicks,social_spend,inline_link_clicks,inline_post_engagement,engagement_rate,save_rate,bounce_rate,return_viewers,best_performing_region,audience_retention{age_groups,gender,interests},outcome_vs_expected,prediction_confidence_at_launch,causal_inference_score,model_version_used,experiment_batch_id,tag_correlation_delta,region,start_time,end_time}",
        page_insights: "page_impressions,page_engaged_users,page_post_engagements,page_actions,page_video_views,page_video_views_paid,page_video_views_organic",
        audience_insights: "audience_city,audience_country,audience_gender_age,audience_locale"
      };

      const selectedFields = fields || defaultFields[action as keyof typeof defaultFields] || "";

      let endpoint = "";
      switch (action) {
        case "ad_performance":
        case "active_ads":
          endpoint = `${process.env.META_AD_ACCOUNT_ID}/ads`;
          break;
        case "page_insights":
          endpoint = `${pageId}/insights`;
          break;
        case "audience_insights":
          endpoint = `${pageId}/insights`;
          break;
      }

      const params: Record<string, string> = {
        fields: selectedFields,
        limit: limit?.toString() || "50",
        time_range: timeRange
      };

      const response = await fetchFromMeta(endpoint, accessToken, params) as MetaApiResponse<MetaAdPerformance>;
      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      console.error("Error in meta analytics tool:", error);
      throw error;
    }
  },
}); 
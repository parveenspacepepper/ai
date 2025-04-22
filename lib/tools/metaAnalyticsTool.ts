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

// Add function to fetch active ads
async function fetchActiveAds(accessToken: string): Promise<MetaAdPerformance[]> {
  const endpoint = `${process.env.META_API_BASE_URL}/${process.env.META_AD_ACCOUNT_ID}/ads`;
  const params = {
    access_token: accessToken,
    fields: `
      id,name,status,effective_status,
      campaign{id,name,objective,status},
      adset{id,name,targeting,status},
      creative{id,title,body,image_url,video_id,
        duration_sec,frame_rate,resolution,aspect_ratio,
        sound_type,language,creative_format,production_elements,
        core_elements_highlighted,ad_objective,cta_type,
        funnel_stage,target_persona,audience_traits,
        distribution_channel},
      insights{impressions,clicks,spend,ctr,cpc,
        conversions,conversion_rate,reach,frequency,
        unique_clicks,video_views,video_30_sec_watched_views,
        video_p25_watched_actions,video_p50_watched_actions,
        video_p75_watched_actions,video_p95_watched_actions,
        video_p100_watched_actions,video_avg_time_watched_actions,
        social_impressions,social_clicks,social_spend,
        inline_link_clicks,inline_post_engagement,
        engagement_rate,save_rate,bounce_rate,
        return_viewers,best_performing_region,
        audience_retention{age_groups,gender,interests},
        outcome_vs_expected,prediction_confidence_at_launch,
        causal_inference_score,model_version_used,
        experiment_batch_id,tag_correlation_delta,
        region,start_time,end_time
      }
    `.replace(/\s+/g, ''),
    filtering: JSON.stringify([{
      field: 'effective_status',
      operator: 'IN',
      value: ['ACTIVE']
    }])
  };

  const response = await fetchFromMeta(endpoint, accessToken, params) as { data: MetaAdPerformance[] };
  return response.data;
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
    pageId: z.string().optional(),
    postId: z.string().optional(),
    adId: z.string().optional(),
    campaignId: z.string().optional(),
    adsetId: z.string().optional(),
    dateRange: z.string().optional(),
    status: z.enum(["ACTIVE", "PAUSED", "DELETED", "ALL"]).optional(),
    fields: z.string().optional(),
    limit: z.number().optional(),
  }),
  func: async ({ action, dateRange,  fields, limit, pageId, postId, adId, campaignId, adsetId }) => {
    try {
      const accessToken = await getValidAccessToken();
      
      if (action === "active_ads") {
        const activeAds = await fetchActiveAds(accessToken);
        return JSON.stringify(activeAds, null, 2);
      }

      // Default fields if none specified
      const defaultFields = {
        ad_performance: `
          id,name,
          campaign{id,name,objective,status},
          adset{id,name,targeting,status},
          creative{
            id,title,body,image_url,video_id,
            duration_sec,frame_rate,resolution,aspect_ratio,
            sound_type,language,creative_format,production_elements,
            core_elements_highlighted,ad_objective,cta_type,
            funnel_stage,target_persona,audience_traits,distribution_channel
          },
          insights{
            impressions,clicks,spend,ctr,cpc,conversions,conversion_rate,
            reach,frequency,unique_clicks,
            video_views,video_30_sec_watched_views,
            video_p25_watched_actions,video_p50_watched_actions,
            video_p75_watched_actions,video_p95_watched_actions,
            video_p100_watched_actions,video_avg_time_watched_actions,
            view_duration_avg,audience_retention_curve,
            social_impressions,social_clicks,social_spend,
            inline_link_clicks,inline_post_engagement,
            engagement_rate,save_rate,bounce_rate,
            return_viewers,best_performing_region,
            audience_retention{age_groups,gender,interests},
            outcome_vs_expected,prediction_confidence_at_launch,
            causal_inference_score,model_version_used,
            experiment_batch_id,tag_correlation_delta,
            region,start_time,end_time
          },
          effective_status,status,created_time,updated_time
        `,
        campaign_performance: "id,name,objective,status,start_time,stop_time,daily_budget,lifetime_budget,insights{impressions,clicks,spend,ctr,cpc,conversions,conversion_rate,reach,frequency,unique_clicks,social_impressions,social_clicks,social_spend,inline_link_clicks,inline_post_engagement,video_views,video_30_sec_watched_views,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions,video_avg_time_watched_actions,region,start_time,end_time}",
        adset_performance: "id,name,campaign_id,status,targeting,daily_budget,lifetime_budget,start_time,end_time,insights{impressions,clicks,spend,ctr,cpc,conversions,conversion_rate,reach,frequency,unique_clicks,social_impressions,social_clicks,social_spend,inline_link_clicks,inline_post_engagement,video_views,video_30_sec_watched_views,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions,video_avg_time_watched_actions,region,start_time,end_time}"
      };

      const selectedFields: string = fields || defaultFields[action as keyof typeof defaultFields] || "";
      const timeRange = dateRange ? JSON.stringify({ since: dateRange }) : undefined;
      // const statusFilter = status && status !== "ALL" ? `&effective_status=${status}` : "";

      let endpoint = "";
      switch (action) {
        case "ad_performance":
          endpoint = adId ? `/${adId}` : "/me/ads";
          break;
        case "campaign_performance":
          endpoint = campaignId ? `/${campaignId}` : "/me/campaigns";
          break;
        case "adset_performance":
          endpoint = adsetId ? `/${adsetId}` : "/me/adsets";
          break;
        case "post_performance":
          endpoint = postId ? `/${postId}` : "/me/posts";
          break;
        case "page_insights":
          endpoint = pageId ? `/${pageId}/insights` : "/me/insights";
          break;
        case "audience_insights":
          endpoint = "/me/insights";
          break;
      }

      const params: Record<string, string> = {
        fields: selectedFields,
        limit: limit?.toString() || "50",
        ...(timeRange && { time_range: timeRange })
      };

      const response = await fetchFromMeta(
        endpoint,
        accessToken,
        params
      );

      return JSON.stringify(response, null, 2);
    } catch (error) {
      console.error("Error in meta analytics tool:", error);
      throw error;
    }
  },
}); 
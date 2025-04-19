import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/metaAuth';

export async function GET() {
  try {
    // Get a valid access token
    const accessToken = await getValidAccessToken();
    
    // Make a simple API call to verify the token works
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${accessToken}`
    );
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `API call failed: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const userData = await response.json();
    
    // Get user's pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );
    
    let pagesData = null;
    let insightsData = null;
    
    if (pagesResponse.ok) {
      pagesData = await pagesResponse.json();
      
      // If pages exist, get insights for the first page
      if (pagesData.data && pagesData.data.length > 0) {
        const page = pagesData.data[0];
        const insightsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}/insights?` +
          `metric=page_impressions,page_engaged_users,page_views,page_actions&` +
          `period=day&access_token=${page.access_token || accessToken}`
        );
        
        if (insightsResponse.ok) {
          insightsData = await insightsResponse.json();
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      user: userData,
      pages: pagesData,
      insights: insightsData
    });
  } catch (error) {
    console.error('Error testing Meta API:', error);
    return NextResponse.json(
      { error: 'Failed to test Meta API' },
      { status: 500 }
    );
  }
} 
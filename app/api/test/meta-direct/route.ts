import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get the access token directly from environment variables
    const accessToken = process.env.META_SHORT_LIVED_TOKEN;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Missing META_SHORT_LIVED_TOKEN in environment variables' },
        { status: 500 }
      );
    }
    
    // Make a simple API call to verify the token works
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${accessToken}`
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `API call failed: ${response.status} ${response.statusText} - ${errorText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Test page insights if available
    let insightsData = null;
    if (data.id) {
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${data.id}/insights?metric=page_impressions,page_engaged_users&access_token=${accessToken}`
      );
      
      if (insightsResponse.ok) {
        insightsData = await insightsResponse.json();
      }
    }
    
    return NextResponse.json({
      success: true,
      userData: data,
      insights: insightsData
    });
  } catch (error) {
    console.error('Error testing Meta API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get the credentials from environment variables
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const shortLivedToken = process.env.META_SHORT_LIVED_TOKEN;
    const refreshToken = process.env.META_REFRESH_TOKEN;
    
    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: 'Missing META_APP_ID or META_APP_SECRET in environment variables' },
        { status: 500 }
      );
    }

    // Test token debug info
    let tokenDebugInfo = null;
    let tokenDebugError = null;

    if (shortLivedToken) {
      try {
        const debugUrl = `https://graph.facebook.com/debug_token?input_token=${shortLivedToken}&access_token=${appId}|${appSecret}`;
        const debugResponse = await fetch(debugUrl);
        tokenDebugInfo = await debugResponse.json();
        
        if (!debugResponse.ok || tokenDebugInfo.error) {
          tokenDebugError = `Token debug failed: ${JSON.stringify(tokenDebugInfo.error || tokenDebugInfo)}`;
        }
      } catch (error) {
        tokenDebugError = `Error debugging token: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else {
      tokenDebugError = 'META_SHORT_LIVED_TOKEN is not set';
    }
    
    // Test direct token exchange
    let tokenExchangeResult = null;
    let tokenExchangeError = null;
    
    if (shortLivedToken) {
      try {
        const url = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
        const response = await fetch(url);
        
        if (response.ok) {
          tokenExchangeResult = await response.json();
        } else {
          const errorData = await response.json().catch(() => null);
          tokenExchangeError = `Token exchange failed: ${response.status} ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`;
        }
      } catch (error) {
        tokenExchangeError = `Error exchanging token: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else {
      tokenExchangeError = 'META_SHORT_LIVED_TOKEN is not set';
    }
    
    // Test refresh token if available
    let refreshResult = null;
    let refreshError = null;
    
    if (refreshToken) {
      try {
        const url = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${refreshToken}`;
        const response = await fetch(url);
        
        if (response.ok) {
          refreshResult = await response.json();
        } else {
          const errorData = await response.json().catch(() => null);
          refreshError = `Refresh token exchange failed: ${response.status} ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`;
        }
      } catch (error) {
        refreshError = `Error refreshing token: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else {
      refreshError = 'META_REFRESH_TOKEN is not set';
    }
    
    return NextResponse.json({
      success: true,
      tokenDebug: {
        info: tokenDebugInfo,
        error: tokenDebugError
      },
      tokenExchange: {
        result: tokenExchangeResult,
        error: tokenExchangeError
      },
      refreshToken: {
        result: refreshResult,
        error: refreshError
      }
    });
  } catch (error) {
    console.error('Error testing Meta tokens:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
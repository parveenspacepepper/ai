import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, saveTokenInfo } from '@/lib/metaAuth';

export async function GET(request: NextRequest) {
  try {
    // Get the code from the URL
    const searchParams = new URL(request.url).searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle errors from Meta
    if (error) {
      console.error('Meta OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`, request.url)
      );
    }

    // Check if we have a code
    if (!code) {
      console.error('No code received from Meta');
      return NextResponse.redirect(
        new URL('/auth/error?error=no_code&description=No authorization code received from Meta', request.url)
      );
    }

    // Exchange code for tokens
    const { accessToken, refreshToken } = await getTokensFromCode(code);

    // Validate tokens
    if (!accessToken) {
      throw new Error('No access token received from Meta');
    }

    // Save the tokens with 60 day expiration (Meta's long-lived tokens last 60 days)
    const expiresAt = Date.now() + (60 * 24 * 60 * 60 * 1000); // 60 days
    await saveTokenInfo({
      access_token: accessToken,
      refresh_token: refreshToken || accessToken, // Meta uses same token for refresh
      expires_at: expiresAt,
      token_type: 'bearer'
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/dashboard?auth=success', request.url)
    );
  } catch (error) {
    console.error('Error in Meta callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      new URL(`/auth/error?error=token_exchange_failed&description=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
} 
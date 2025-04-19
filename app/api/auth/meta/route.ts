import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/metaAuth';

export async function GET(request: NextRequest) {
  try {
    const authUrl = getAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error generating Meta auth URL:', error);
    return NextResponse.redirect(new URL('/auth/error?error=auth_url_failed', request.url));
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/googleAuth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect('/auth/error?message=No authorization code received');
  }
  
  try {
    const tokens = await getTokensFromCode(code);
    
    // In a real application, you would store these tokens securely
    // For example, in a database associated with the user's account
    
    // For demonstration purposes, we'll redirect to a success page with the tokens
    // In production, you should never expose tokens in the URL
    return NextResponse.redirect(
      `/auth/success?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`
    );
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return NextResponse.redirect('/auth/error?message=Failed to exchange authorization code');
  }
} 
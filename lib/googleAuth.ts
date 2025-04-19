// Get the Google OAuth URL for authorization
export function getAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    throw new Error('Missing Google OAuth credentials');
  }
  
  const scope = encodeURIComponent('https://www.googleapis.com/auth/analytics.readonly');
  
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
}

// Exchange authorization code for tokens
export async function getTokensFromCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Google OAuth credentials');
  }
  
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to get tokens: ${errorData.error_description || response.statusText}`);
  }
  
  return response.json();
}

// Get a valid access token (either existing or refreshed)
export async function getValidAccessToken(): Promise<string> {
  // In a real implementation, you would:
  // 1. Check if you have a stored token
  // 2. Verify if it's expired
  // 3. If expired, use the refresh token to get a new one
  // 4. Return the valid token
  
  // For now, we'll just return the access token from env
  const accessToken = process.env.GOOGLE_ANALYTICS_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('No Google access token available');
  }
  
  return accessToken;
} 
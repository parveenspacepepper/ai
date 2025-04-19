import fs from 'fs';
import path from 'path';

// Interface for Meta token response
interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Interface for Meta long-lived token response
interface MetaLongLivedTokenResponse extends MetaTokenResponse {
  refresh_token?: string;
}

// Interface for Meta token info
interface MetaTokenInfo {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type: string;
}

// Path to store token information
const TOKEN_FILE_PATH = path.join(process.cwd(), 'data', 'meta_token.json');

const META_APP_ID = process.env.META_APP_ID as string;
const META_APP_SECRET = process.env.META_APP_SECRET as string;
const META_REDIRECT_URI = process.env.META_REDIRECT_URI as string;

if (!META_APP_ID || !META_APP_SECRET || !META_REDIRECT_URI) {
  throw new Error('Missing required Meta OAuth credentials');
}

/**
 * Get a new short-lived access token from Meta
 * @returns Promise with the token response
 */
export async function getShortLivedToken(): Promise<MetaTokenResponse> {
  const shortLivedToken = process.env.META_SHORT_LIVED_TOKEN;

  if (!shortLivedToken) {
    throw new Error('Missing META_SHORT_LIVED_TOKEN in environment variables.');
  }

  try {
    // Verify the token belongs to our app
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${shortLivedToken}&access_token=${META_APP_ID}|${META_APP_SECRET}`;
    const debugResponse = await fetch(debugUrl);
    const debugData = await debugResponse.json();

    if (!debugResponse.ok || debugData.error) {
      throw new Error(`Token validation failed: ${JSON.stringify(debugData.error || debugData)}`);
    }

    if (debugData.data?.app_id !== META_APP_ID) {
      throw new Error(`Token belongs to different app (${debugData.data?.app_id}), expected ${META_APP_ID}`);
    }

    // Exchange the token
    const url = `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${META_APP_ID}&` +
      `client_secret=${META_APP_SECRET}&` +
      `fb_exchange_token=${shortLivedToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Failed to exchange token: ${response.status} ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    if (!data.access_token) {
      throw new Error('Invalid token response from Meta API');
    }
    
    return {
      access_token: data.access_token,
      token_type: data.token_type || 'bearer',
      expires_in: data.expires_in || 5184000 // Default to 60 days if not specified
    };
  } catch (error) {
    console.error('Error in getShortLivedToken:', error);
    throw error;
  }
}

/**
 * Exchange a token for a long-lived token
 * @param token The short-lived token to exchange
 * @returns Promise with the long-lived token response
 */
export async function getLongLivedToken(token: string): Promise<MetaLongLivedTokenResponse> {
  try {
    const url = `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${META_APP_ID}&` +
      `client_secret=${META_APP_SECRET}&` +
      `fb_exchange_token=${token}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Failed to get long-lived token: ${response.status} ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    if (!data.access_token) {
      throw new Error('Invalid response from Meta API');
    }
    
    return {
      access_token: data.access_token,
      token_type: data.token_type || 'bearer',
      expires_in: data.expires_in || 5184000, // Default to 60 days
      refresh_token: data.refresh_token
    };
  } catch (error) {
    console.error('Error in getLongLivedToken:', error);
    throw error;
  }
}

/**
 * Save token information to a file
 * @param tokenInfo Token information to save
 */
export function saveTokenInfo(tokenInfo: MetaTokenInfo): void {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(tokenInfo, null, 2));
  } catch (error) {
    console.error('Error saving token info:', error);
    throw error;
  }
}

/**
 * Load token information from a file
 * @returns Token information or null if not found
 */
export function loadTokenInfo(): MetaTokenInfo | null {
  try {
    if (!fs.existsSync(TOKEN_FILE_PATH)) {
      return null;
    }
    const data = fs.readFileSync(TOKEN_FILE_PATH, 'utf8');
    return JSON.parse(data) as MetaTokenInfo;
  } catch (error) {
    console.error('Error loading token info:', error);
    return null;
  }
}

/**
 * Check if a token is expired or about to expire
 * @param expiresAt Expiration timestamp
 * @returns True if the token is expired or about to expire, false otherwise
 */
export function isTokenExpired(expiresAt: number): boolean {
  const bufferTime = 24 * 60 * 60 * 1000; // 1 day buffer
  return Date.now() + bufferTime >= expiresAt;
}

/**
 * Get a valid access token, refreshing if necessary
 * @returns Promise with a valid access token
 */
export async function getValidAccessToken(): Promise<string> {
  try {
    // Try to load existing token
    const tokenInfo = loadTokenInfo();
    
    // If we have a valid token that's not expired, use it
    if (tokenInfo && !isTokenExpired(tokenInfo.expires_at)) {
      return tokenInfo.access_token;
    }
    
    // If we have a refresh token, try to use it
    if (tokenInfo?.refresh_token) {
      try {
        const newAccessToken = await refreshAccessToken(tokenInfo.refresh_token);
        const newTokenInfo: MetaTokenInfo = {
          access_token: newAccessToken,
          refresh_token: tokenInfo.refresh_token,
          expires_at: Date.now() + (60 * 24 * 60 * 60 * 1000), // 60 days
          token_type: 'bearer'
        };
        saveTokenInfo(newTokenInfo);
        return newAccessToken;
      } catch (refreshError) {
        console.warn('Failed to refresh token, falling back to short-lived token:', refreshError);
      }
    }
    
    // If refresh fails or no refresh token, try to get a new long-lived token
    const shortLivedToken = await getShortLivedToken();
    const longLivedToken = await getLongLivedToken(shortLivedToken.access_token);
    
    const newTokenInfo: MetaTokenInfo = {
      access_token: longLivedToken.access_token,
      refresh_token: longLivedToken.refresh_token,
      expires_at: Date.now() + (longLivedToken.expires_in * 1000),
      token_type: longLivedToken.token_type
    };
    
    saveTokenInfo(newTokenInfo);
    return longLivedToken.access_token;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    throw error;
  }
}

/**
 * Set up automatic token refresh
 * This should be called when your application starts
 */
export function setupTokenRefresh(): void {
  // Check token validity every 12 hours
  const REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
  
  const refreshToken = async () => {
    try {
      await getValidAccessToken();
      console.log('Meta token refreshed successfully');
    } catch (error) {
      console.error('Error refreshing Meta token:', error);
    }
  };

  // Initial refresh
  refreshToken();
  
  // Set up periodic refresh
  setInterval(refreshToken, REFRESH_INTERVAL);
}

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: META_REDIRECT_URI,
    scope: 'pages_show_list,pages_read_engagement,pages_manage_metadata,pages_manage_posts',
    response_type: 'code',
    state: Math.random().toString(36).substring(7) // Add CSRF protection
  });

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function getTokensFromCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
  try {
    // First exchange the code for a short-lived token
    const shortLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${META_APP_ID}&` +
      `client_secret=${META_APP_SECRET}&` +
      `redirect_uri=${META_REDIRECT_URI}&` +
      `code=${code}`
    );

    if (!shortLivedTokenResponse.ok) {
      const errorData = await shortLivedTokenResponse.json().catch(() => null);
      throw new Error(`Failed to exchange code: ${shortLivedTokenResponse.status} ${shortLivedTokenResponse.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
    }

    const shortLivedData = await shortLivedTokenResponse.json();
    
    if (!shortLivedData.access_token) {
      throw new Error('No access token received from Meta');
    }

    // Exchange short-lived token for a long-lived token
    const longLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${META_APP_ID}&` +
      `client_secret=${META_APP_SECRET}&` +
      `fb_exchange_token=${shortLivedData.access_token}`
    );

    if (!longLivedTokenResponse.ok) {
      const errorData = await longLivedTokenResponse.json().catch(() => null);
      throw new Error(`Failed to get long-lived token: ${longLivedTokenResponse.status} ${longLivedTokenResponse.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
    }

    const longLivedData = await longLivedTokenResponse.json();

    if (!longLivedData.access_token) {
      throw new Error('No long-lived access token received from Meta');
    }

    // Return both tokens
    return {
      accessToken: longLivedData.access_token,
      refreshToken: longLivedData.access_token // Meta uses the same token for refresh
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
}

/**
 * Refresh an access token using a refresh token
 * @param refreshToken The refresh token to use
 * @returns Promise with the new access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  try {
    const url = `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=refresh_token&` +
      `client_id=${META_APP_ID}&` +
      `client_secret=${META_APP_SECRET}&` +
      `refresh_token=${refreshToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Failed to refresh token: ${response.status} ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    if (!data.access_token) {
      throw new Error('Invalid response from Meta API');
    }
    
    return data.access_token;
  } catch (error) {
    console.error('Error in refreshAccessToken:', error);
    throw error;
  }
} 
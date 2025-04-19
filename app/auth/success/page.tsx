'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function AuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('access_token');
    const refresh = searchParams.get('refresh_token');
    
    if (token) {
      setAccessToken(token);
    }
    
    if (refresh) {
      setRefreshToken(refresh);
    }
  }, [searchParams]);

  const handleSaveTokens = async () => {
    try {
      // In a real application, you would send these tokens to your backend
      // to store them securely associated with the user's account
      
      // For demonstration purposes, we'll just save them to localStorage
      // This is NOT secure and should NOT be done in production
      if (accessToken) {
        localStorage.setItem('google_analytics_access_token', accessToken);
      }
      
      if (refreshToken) {
        localStorage.setItem('google_analytics_refresh_token', refreshToken);
      }
      
      // Redirect to dashboard or analytics page
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Successful</CardTitle>
          <CardDescription>
            You have successfully connected your Google Analytics account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">Access Token</h3>
              <p className="text-xs text-gray-500 break-all">
                {accessToken ? `${accessToken.substring(0, 20)}...` : 'Not available'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Refresh Token</h3>
              <p className="text-xs text-gray-500 break-all">
                {refreshToken ? `${refreshToken.substring(0, 20)}...` : 'Not available'}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveTokens} className="w-full">
            Save and Continue
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense>
      <AuthSuccessContent />
    </Suspense>
  );
} 
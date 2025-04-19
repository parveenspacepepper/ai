'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface MetaTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  refreshResult?: boolean;
}

export default function MetaTokenTestPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MetaTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testTokenExchange = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/test/meta-token');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to test Meta token exchange');
      }
      
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Meta API Token Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Meta Token Exchange</CardTitle>
          <CardDescription>
            This will test the token exchange process with Meta API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={testTokenExchange} 
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test Token Exchange'}
          </Button>
        </CardContent>
      </Card>
      
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{error}</pre>
          </CardContent>
        </Card>
      )}
      
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-gray-500">
              {results.access_token ? 'Token exchange successful!' : 'Token exchange failed.'}
              {results.refreshResult ? ' Refresh token exchange successful!' : ' Refresh token exchange failed.'}
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
} 
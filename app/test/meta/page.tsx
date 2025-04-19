'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface MetaApiResponse {
  name?: string;
  id?: string;
  error?: string;
  insights?: Record<string, unknown>;
}

export default function MetaTestPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MetaApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testMetaAPI = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/test/meta');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test Meta API');
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
      <h1 className="text-3xl font-bold mb-6">Meta API Test</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Test Meta API Integration</CardTitle>
          <CardDescription>
            This page tests the connection to the Meta API using your configured credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Click the button below to test your Meta API integration. This will:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Retrieve a valid access token</li>
            <li>Make a test API call to the Meta Graph API</li>
            <li>Attempt to fetch page insights if available</li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={testMetaAPI} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Meta API'}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Card className="mb-8 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
              <pre className="text-sm">{JSON.stringify(results, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 
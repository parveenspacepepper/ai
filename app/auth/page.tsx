'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();

  const handleGoogleAuth = () => {
    router.push('/api/auth/google');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect Google Analytics</CardTitle>
          <CardDescription>
            Connect your Google Analytics account to access analytics data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            This will redirect you to Google to authorize access to your Analytics data.
            You&apos;ll need to have a Google Analytics account set up.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGoogleAuth} className="w-full">
            Connect with Google
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 
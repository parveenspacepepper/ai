import { getValidAccessToken } from './metaAuth.js';

async function testMetaAPI() {
  try {
    console.log('Starting Meta API test...');
    
    // Get a valid access token
    const accessToken = await getValidAccessToken();
    console.log('Successfully obtained access token');
    
    // Make a simple API call to verify the token
    const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${accessToken}`);
    
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API call successful!');
    console.log('User data:', data);
    
    // Test page insights
    try {
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${data.id}/insights?metric=page_impressions,page_engaged_users&access_token=${accessToken}`
      );
      
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        console.log('Page insights:', insightsData);
      } else {
        console.log('Could not fetch page insights. This is normal if the app does not have page access.');
      }
    } catch (insightsError) {
      console.log('Error fetching page insights:', insightsError.message);
    }
    
    console.log('Meta API test completed successfully!');
  } catch (error) {
    console.error('Error testing Meta API:', error.message);
  }
}

// Run the test
testMetaAPI(); 
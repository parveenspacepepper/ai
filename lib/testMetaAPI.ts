import { getValidAccessToken } from './metaAuth';

/**
 * Test script to verify Meta API integration
 * Run with: npx ts-node lib/testMetaAPI.ts
 */
async function testMetaAPI() {
  try {
    console.log('🔍 Testing Meta API Integration...');
    
    // Get a valid access token
    console.log('📝 Getting access token...');
    const accessToken = await getValidAccessToken();
    console.log('✅ Access token obtained successfully');
    
    // Make a simple API call to verify the token works
    console.log('🌐 Making API call to Meta Graph API...');
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${accessToken}`
    );
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ API call successful!');
    console.log('📊 Response data:');
    console.log(JSON.stringify(data, null, 2));
    
    // Test page insights if available
    if (data.id) {
      console.log('\n📊 Testing page insights...');
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${data.id}/insights?metric=page_impressions,page_engaged_users&access_token=${accessToken}`
      );
      
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        console.log('✅ Page insights retrieved successfully!');
        console.log(JSON.stringify(insightsData, null, 2));
      } else {
        console.log('⚠️ Could not retrieve page insights. This might be due to permissions or the page not having insights available.');
      }
    }
    
    console.log('\n✨ Meta API integration test completed successfully!');
    return data;
  } catch (error) {
    console.error('❌ Error testing Meta API:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMetaAPI()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export default testMetaAPI; 
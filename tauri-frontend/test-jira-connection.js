// Comprehensive Jira Connection Test Script
// Run this in the browser console after the app loads

window.testJiraComprehensive = async function() {
  console.log('=== COMPREHENSIVE JIRA CONNECTION TEST ===');
  
  try {
    // Test 1: Check if Tauri invoke is available
    console.log('\n1. Testing Tauri invoke availability...');
    if (typeof window.invoke === 'undefined') {
      console.error('❌ Tauri invoke not available - this is a web browser, not the Tauri app');
      return;
    }
    console.log('✅ Tauri invoke available');
    
    // Test 2: Check Jira config
    console.log('\n2. Testing Jira configuration...');
    const config = await window.invoke('load_jira_config');
    if (!config) {
      console.error('❌ No Jira configuration found');
      console.log('Please configure Jira credentials first');
      return;
    }
    console.log('✅ Jira config found:', {
      baseUrl: config.base_url,
      email: config.email,
      hasToken: !!config.api_token
    });
    
    // Test 3: Test basic Jira connection
    console.log('\n3. Testing basic Jira connection...');
    const testResult = await window.invoke('test_jira_connection', { config });
    console.log('Connection test result:', testResult);
    if (!testResult.success) {
      console.error('❌ Jira connection failed:', testResult.message);
      return;
    }
    console.log('✅ Jira connection successful');
    
    // Test 4: Test fetching a specific card
    console.log('\n4. Testing card data fetch...');
    const testCard = 'ADVICE-100';
    try {
      const cardData = await window.invoke('fetch_card_data', { config, issueKey: testCard });
      console.log('✅ Card data fetched successfully:', {
        key: cardData.key,
        summary: cardData.fields?.summary,
        status: cardData.fields?.status?.name,
        hasSubtasks: !!cardData.fields?.subtasks,
        subtaskCount: cardData.fields?.subtasks?.length || 0
      });
    } catch (error) {
      console.error('❌ Failed to fetch card data:', error);
    }
    
    // Test 5: Test child issues fetching with different JQL queries
    console.log('\n5. Testing child issues fetching...');
    const testQueries = [
      `parent = ${testCard}`,
      `"Epic Link" = ${testCard}`,
      `parentEpic = ${testCard}`,
      `cf[10014] = ${testCard}`,
      `issue in subtasksOf(${testCard})`,
      `key in linkedIssues(${testCard})`
    ];
    
    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`\nTesting query ${i + 1}: ${query}`);
      try {
        const result = await window.invoke('fetch_child_issues', { 
          config, 
          parentKey: testCard, 
          jql_override: query 
        });
        console.log(`Query ${i + 1} result:`, {
          hasIssues: !!result.issues,
          issueCount: result.issues?.length || 0,
          total: result.total || 0
        });
        if (result.issues && result.issues.length > 0) {
          console.log('✅ Found child issues with this query!');
          result.issues.forEach((issue, idx) => {
            console.log(`  ${idx + 1}. ${issue.key}: ${issue.fields?.summary || 'No summary'}`);
          });
        }
      } catch (error) {
        console.log(`❌ Query ${i + 1} failed:`, error);
      }
    }
    
    // Test 6: Test the main fetch_child_issues function
    console.log('\n6. Testing main fetch_child_issues function...');
    try {
      const childData = await window.invoke('fetch_child_issues', { 
        config, 
        parentKey: testCard
      });
      console.log('Main function result:', {
        hasIssues: !!childData.issues,
        issueCount: childData.issues?.length || 0,
        total: childData.total || 0
      });
      if (childData.issues && childData.issues.length > 0) {
        console.log('✅ Main function found child issues!');
      } else {
        console.log('⚠️ Main function returned no child issues');
      }
    } catch (error) {
      console.error('❌ Main function failed:', error);
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Test specific card function
window.testSpecificCardDetailed = async function(cardKey) {
  console.log(`=== DETAILED TEST FOR CARD: ${cardKey} ===`);
  
  try {
    const config = await window.invoke('load_jira_config');
    if (!config) {
      console.error('No Jira config found');
      return;
    }
    
    // Test individual JQL queries
    const queries = [
      `parent = ${cardKey}`,
      `"Epic Link" = ${cardKey}`,
      `parentEpic = ${cardKey}`,
      `cf[10014] = ${cardKey}`,
      `issue in subtasksOf(${cardKey})`,
      `key in linkedIssues(${cardKey})`
    ];
    
    for (const query of queries) {
      console.log(`\nTesting: ${query}`);
      try {
        const result = await window.invoke('fetch_child_issues', { 
          config, 
          parentKey: cardKey, 
          jql_override: query 
        });
        console.log('Result:', result);
        if (result.issues && result.issues.length > 0) {
          console.log(`✅ SUCCESS: Found ${result.issues.length} child issues`);
          result.issues.forEach((issue, idx) => {
            console.log(`  ${idx + 1}. ${issue.key}: ${issue.fields?.summary || 'No summary'}`);
          });
        } else {
          console.log('⚠️ No issues found with this query');
        }
      } catch (err) {
        console.log(`❌ Query failed:`, err);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

console.log('Test functions loaded. Run:');
console.log('- testJiraComprehensive() - Full test suite');
console.log('- testSpecificCardDetailed("CARD-KEY") - Test specific card');

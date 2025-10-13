// Debug script to test child issues fetching
// Run this in the browser console to test specific cards

window.debugChildIssues = async function(cardKey) {
  console.log(`=== DEBUGGING CHILD ISSUES FOR ${cardKey} ===`);
  
  try {
    // Check Jira config
    const config = await window.invoke('load_jira_config');
    console.log('Jira config:', config);
    
    if (!config) {
      console.error('No Jira configuration found!');
      return;
    }
    
    // Test different JQL queries
    const queries = [
      `parent = ${cardKey}`,
      `"Epic Link" = ${cardKey}`,
      `parentEpic = ${cardKey}`,
      `issue in subtasksOf(${cardKey})`,
      `key in linkedIssues(${cardKey})`
    ];
    
    for (const query of queries) {
      try {
        console.log(`\n--- Testing query: ${query} ---`);
        const result = await window.invoke('fetch_child_issues', { 
          config, 
          parentKey: cardKey, 
          jql_override: query 
        });
        
        console.log(`Query result:`, result);
        if (result && result.issues) {
          console.log(`Found ${result.issues.length} issues`);
          result.issues.forEach((issue, index) => {
            console.log(`  ${index + 1}. ${issue.key}: ${issue.fields?.summary || 'No summary'}`);
          });
        }
      } catch (err) {
        console.log(`Query failed:`, err);
      }
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
};

console.log('Debug script loaded. Use debugChildIssues("CARD-KEY") to test a specific card.');

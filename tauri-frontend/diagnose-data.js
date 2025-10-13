// Data Structure Diagnostic Script
// Run this in the browser console to check data structure

window.diagnoseData = function() {
  console.log('=== DATA STRUCTURE DIAGNOSIS ===');
  
  // Check if we can access the app state
  if (typeof window.React !== 'undefined') {
    console.log('✅ React detected');
  } else {
    console.log('❌ React not detected');
  }
  
  // Check localStorage for any stored data
  console.log('\n1. Checking localStorage...');
  const keys = Object.keys(localStorage);
  console.log('LocalStorage keys:', keys);
  
  // Check for any global variables that might contain data
  console.log('\n2. Checking global variables...');
  const globalVars = Object.keys(window).filter(key => 
    key.includes('data') || 
    key.includes('board') || 
    key.includes('jira') ||
    key.includes('columns')
  );
  console.log('Relevant global variables:', globalVars);
  
  // Check if we can access the app's state
  console.log('\n3. Checking for app state...');
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React DevTools detected');
    console.log('You can use React DevTools to inspect component state');
  }
  
  // Check for any error messages in console
  console.log('\n4. Checking for recent errors...');
  const originalError = console.error;
  const errors = [];
  console.error = function(...args) {
    errors.push(args.join(' '));
    originalError.apply(console, args);
  };
  
  setTimeout(() => {
    console.error = originalError;
    if (errors.length > 0) {
      console.log('Recent errors found:', errors);
    } else {
      console.log('No recent errors detected');
    }
  }, 1000);
  
  console.log('\n=== DIAGNOSIS COMPLETE ===');
  console.log('If you see the app running, try:');
  console.log('- testJiraComprehensive() - Test Jira connection');
  console.log('- Check the Network tab for failed API calls');
  console.log('- Check the Console for error messages');
};

// Function to check if the app is in an infinite loading state
window.checkLoadingState = function() {
  console.log('=== CHECKING LOADING STATE ===');
  
  // Look for loading indicators in the DOM
  const loadingElements = document.querySelectorAll('[class*="loading"], [class*="Loading"], [class*="spinner"], [class*="Spinner"]');
  console.log('Loading elements found:', loadingElements.length);
  
  // Check for any infinite loops in console
  const logs = [];
  const originalLog = console.log;
  console.log = function(...args) {
    logs.push(args.join(' '));
    originalLog.apply(console, args);
  };
  
  setTimeout(() => {
    console.log = originalLog;
    const repeatedLogs = logs.filter((log, index) => logs.indexOf(log) !== index);
    if (repeatedLogs.length > 0) {
      console.log('⚠️ Potential infinite loop detected - repeated logs:');
      console.log(repeatedLogs);
    } else {
      console.log('✅ No infinite loops detected');
    }
  }, 5000);
  
  console.log('Monitoring for 5 seconds...');
};

console.log('Diagnostic functions loaded. Run:');
console.log('- diagnoseData() - Check data structure');
console.log('- checkLoadingState() - Check for infinite loading');

// Browser test script for AI SQL feature
// Open browser console and paste this script to test the AI functionality

console.log('🧪 Testing AI SQL Feature in Browser');

// Test 1: Check if AskAI component is rendered
function testComponentPresence() {
    const askAIInput = document.querySelector('[data-test="ask-ai-input"]');
    const askAIButton = document.querySelector('[data-test="ask-ai-button"]');
    
    if (askAIInput && askAIButton) {
        console.log('✅ AskAI component is rendered in SQL Lab');
        return true;
    } else {
        console.log('❌ AskAI component not found. Make sure you are in SQL Lab with database/schema selected');
        return false;
    }
}

// Test 2: Test API call functionality
async function testAPICall() {
    console.log('🔧 Testing AI API call...');
    
    try {
        // Get CSRF token from existing forms
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || 
                         document.querySelector('input[name="csrf_token"]')?.value ||
                         'MISSING';
        
        const response = await fetch('/api/v1/ai/sql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                database_id: 1,
                schema: 'public',
                question: 'show me all users'
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ AI API call successful!');
            console.log('📝 Generated SQL:', data.result?.sql);
            return true;
        } else {
            console.log('❌ AI API call failed:', response.status, data);
            if (response.status === 401) {
                console.log('🔑 Permission issue - make sure you are logged in');
            } else if (response.status === 400) {
                console.log('📝 Request validation issue');
            }
            return false;
        }
    } catch (error) {
        console.log('❌ Network error:', error);
        return false;
    }
}

// Test 3: Simulate button click
function testButtonClick() {
    const askAIInput = document.querySelector('[data-test="ask-ai-input"]');
    const askAIButton = document.querySelector('[data-test="ask-ai-button"]');
    
    if (!askAIInput || !askAIButton) {
        console.log('❌ Cannot test button click - components not found');
        return false;
    }
    
    // Fill input
    askAIInput.value = 'show me all users';
    askAIInput.dispatchEvent(new Event('input', { bubbles: true }));
    askAIInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('🖱️  Simulating button click...');
    
    // Add event listener to catch the API call
    const originalFetch = window.fetch;
    let apiCallMade = false;
    
    window.fetch = function(...args) {
        if (args[0].includes('/api/v1/ai/sql')) {
            apiCallMade = true;
            console.log('✅ API call triggered by button click!');
        }
        return originalFetch.apply(this, args);
    };
    
    // Click button
    askAIButton.click();
    
    // Restore original fetch after a delay
    setTimeout(() => {
        window.fetch = originalFetch;
        if (!apiCallMade) {
            console.log('❌ Button click did not trigger API call');
        }
    }, 1000);
    
    return true;
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting browser tests...\n');
    
    // Wait for page to be ready
    if (document.readyState !== 'complete') {
        console.log('⏳ Waiting for page to load...');
        await new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }
    
    let passed = 0;
    const total = 3;
    
    // Test 1: Component presence
    if (testComponentPresence()) passed++;
    
    // Test 2: Direct API call
    if (await testAPICall()) passed++;
    
    // Test 3: Button click simulation
    if (testButtonClick()) passed++;
    
    console.log(`\n📊 Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All tests passed! AI feature is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Check individual test results above.');
    }
    
    // Instructions
    console.log('\n📋 Manual Test Instructions:');
    console.log('1. Go to SQL Lab');
    console.log('2. Select a database and schema');
    console.log('3. Type a question in the AI input box');
    console.log('4. Click "Ask AI" button');
    console.log('5. Check if SQL appears in the editor');
}

// Auto-run the tests
runAllTests();

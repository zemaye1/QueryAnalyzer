// Background service worker for handling API calls
let apiKey = '';

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkControversial') {
    checkControversialTopic(request.query)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'setApiKey') {
    apiKey = request.apiKey;
    chrome.storage.local.set({ apiKey: apiKey });
    sendResponse({ success: true });
  }
  
  if (request.action === 'getApiKey') {
    sendResponse({ apiKey: apiKey });
  }
});

// Load API key from storage on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['apiKey'], (result) => {
    apiKey = result.apiKey || '';
  });
});

// Also load on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['apiKey'], (result) => {
    apiKey = result.apiKey || '';
  });
});

async function checkControversialTopic(query) {
  if (!apiKey) {
    throw new Error('OpenAI API key not set. Please set it in the extension popup.');
  }

  const prompt = `Analyze the following query to determine if it's about a controversial topic. 
  
Query: "${query}"

Please respond with a JSON object containing:
1. "isControversial": boolean - whether the topic has different perspectives where people do not agree
2. "confidence": number (0-1) - confidence level in the assessment
3. "controversialViewpoints": array of 2-3 STRINGS - each viewpoint should be 2-3 sentences long arguing vigorously from each perspective. Each viewpoint must be a simple text string, not an object. Argue from the perspective of advocates such as privacy advocate, human rights advocate, security advocate, etc. Use the strongest language possible and arguments. Each viewpoint should be from the perspective of the advocate. And criticize the language of the query if relevant. Bring up the names of the individuals who argue for each perspective as prominent critics. Give which one has the strongest viewpoint best critical analysis. 
4. "manipulationDetected": boolean - whether there are signs of manipulation in the query
5. "manipulationIndicators": array of strings - specific indicators of potential manipulation

IMPORTANT: The "controversialViewpoints" must be an array of simple text strings, not objects. Each viewpoint should be a single string containing the full argument.

Return to me if the following query is of a controversial nature. Argue vigorously from each perspective. Indicate if there is manipulation in the query.`;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You a lawyer defending and argueing for various clients. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Try to parse the JSON response
    try {
      const result = JSON.parse(content);
      return result;
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from ChatGPT');
      }
    }
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
} 
// Popup script for managing API key and testing queries
document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyButton = document.getElementById('saveApiKey');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const testQueryTextarea = document.getElementById('testQuery');
  const testButton = document.getElementById('testButton');
  const loading = document.getElementById('loading');
  const testStatus = document.getElementById('testStatus');
  const results = document.getElementById('results');

  // Load saved API key
  chrome.runtime.sendMessage({ action: 'getApiKey' }, (response) => {
    if (response && response.apiKey) {
      apiKeyInput.value = response.apiKey;
    }
  });

  // Save API key
  saveApiKeyButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus(apiKeyStatus, 'Please enter an API key', 'error');
      return;
    }

    chrome.runtime.sendMessage({ action: 'setApiKey', apiKey: apiKey }, (response) => {
      if (response && response.success) {
        showStatus(apiKeyStatus, 'API key saved successfully!', 'success');
      } else {
        showStatus(apiKeyStatus, 'Failed to save API key', 'error');
      }
    });
  });

  // Test query
  testButton.addEventListener('click', async () => {
    const query = testQueryTextarea.value.trim();
    
    if (!query) {
      showStatus(testStatus, 'Please enter a query to test', 'error');
      return;
    }

    // Show loading
    loading.style.display = 'block';
    testStatus.style.display = 'none';
    results.style.display = 'none';
    testButton.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'checkControversial',
        query: query
      });

      if (response.success) {
        displayResults(response.data, query);
      } else {
        showStatus(testStatus, response.error, 'error');
      }
    } catch (error) {
      showStatus(testStatus, 'Failed to analyze query: ' + error.message, 'error');
    } finally {
      loading.style.display = 'none';
      testButton.disabled = false;
    }
  });

  // Enter key to test query
  testQueryTextarea.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      testButton.click();
    }
  });

  function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status ${type}`;
    element.style.display = 'block';
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        element.style.display = 'none';
      }, 3000);
    }
  }

  function displayResults(data, query) {
    const isControversial = data.isControversial;
    const confidence = Math.round(data.confidence * 100);
    
    let html = `
      <h4>Analysis Results</h4>
      <p><strong>Query:</strong> "${query}"</p>
      <p><strong>Status:</strong> 
        <span style="color: ${isControversial ? '#dc3545' : '#28a745'}; font-weight: bold;">
          ${isControversial ? 'Controversial' : 'Not Controversial'}
        </span>
        <span style="color: #666; font-size: 11px;"> (${confidence}% confidence)</span>
      </p>
    `;
    
    if (isControversial && data.controversialViewpoints && data.controversialViewpoints.length > 0) {
      html += `<p><strong>Different Viewpoints:</strong></p>`;
      data.controversialViewpoints.forEach(viewpoint => {
        html += `<div class="viewpoint">${viewpoint}</div>`;
      });
    }
    
    if (data.manipulationDetected && data.manipulationIndicators && data.manipulationIndicators.length > 0) {
      html += `<p><strong>⚠️ Manipulation Detected:</strong></p>`;
      data.manipulationIndicators.forEach(indicator => {
        html += `<div class="manipulation">${indicator}</div>`;
      });
    }
    
    results.innerHTML = html;
    results.style.display = 'block';
  }
}); 
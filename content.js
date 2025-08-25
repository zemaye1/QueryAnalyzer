// Content script to detect queries and text inputs
let isAnalyzing = false;
let currentSearchInput = null;

// Make test function available immediately
window.testQueryAnalyzer = function() {
  console.log('Query Analyzer: Manual test triggered');
  
  // Test if we're on Google
  if (!window.location.hostname.includes('google.com')) {
    console.log('❌ Not on Google domain');
    return;
  }
  
  // Test if search input is found
  const searchInput = document.querySelector('input[name="q"], input[aria-label*="Search"], input[placeholder*="Search Google"], textarea[name="q"]');
  if (!searchInput) {
    console.log('❌ No search input found');
    return;
  }
  
  console.log('✅ Search input found:', searchInput);
  console.log('✅ Search input value:', searchInput.value);
  console.log('✅ Search input form:', searchInput.closest('form'));
  
  // Test with a sample query
  const testQuery = 'Is climate change real?';
  console.log('🧪 Testing with query:', testQuery);
  
  // Manually trigger analysis
  analyzeQuery(testQuery, searchInput);
};

// Add a visible indicator that the extension is loaded
function addExtensionIndicator() {
  if (window.location.hostname.includes('google.com')) {
    const indicator = document.createElement('div');
    indicator.id = 'query-analyzer-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #007bff;
      color: white;
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 12px;
      z-index: 9999;
      font-family: Arial, sans-serif;
    `;
    indicator.textContent = '🔍 Query Analyzer Active';
    indicator.title = 'Click to test manually';
    
    indicator.addEventListener('click', () => {
      window.testQueryAnalyzer();
    });
    
    document.body.appendChild(indicator);
    console.log('Query Analyzer: Extension indicator added');
  }
}

// Function to create and show the analysis overlay
function createAnalysisOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'controversial-checker-overlay';
  overlay.style.cssText = `
    position: absolute;
    width: 100%;
    background: white;
    border: 2px solid #007bff;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: Arial, sans-serif;
    overflow-y: auto;
    display: none;
    margin-top: 5px;
    max-height: 400px;
    overflow-y: auto;
  `;
  
  overlay.innerHTML = `
    <div style="padding: 12px; border-bottom: 1px solid #eee; background: #f8f9fa;">
      <h3 style="margin: 0; color: #333; font-size: 14px;">🔍 Query Analysis</h3>
      <button id="close-overlay" style="position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 16px; cursor: pointer; color: #666;">×</button>
    </div>
    <div id="analysis-content" style="padding: 12px;">
      <div id="loading" style="text-align: center; display: none;">
        <p style="margin: 0; font-size: 13px;">Analyzing query...</p>
        <div style="width: 16px; height: 16px; border: 2px solid #f3f3f3; border-top: 2px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 8px auto;"></div>
      </div>
      <div id="results" style="display: none;"></div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  
  document.body.appendChild(overlay);
  
  // Close button functionality
  document.getElementById('close-overlay').addEventListener('click', () => {
    overlay.style.display = 'none';
  });
  
  return overlay;
}

// Function to position overlay underneath search input
function positionOverlayUnderSearch(overlay, searchInput) {
  if (!searchInput) {
    // Fallback positioning if no search input found
    overlay.style.position = 'fixed';
    overlay.style.top = '100px';
    overlay.style.left = '50%';
    overlay.style.transform = 'translateX(-50%)';
    overlay.style.width = '600px';
    overlay.style.maxWidth = '90vw';
    return;
  }

  const rect = searchInput.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  
  // Find the best positioning target to align with search results
  const positioningTarget = findBestPositioningTarget();
  let left, width;
  
  if (positioningTarget && positioningTarget !== document.body) {
    const targetRect = positioningTarget.getBoundingClientRect();
    left = targetRect.left + scrollLeft;
    width = targetRect.width;
    console.log('Query Analyzer: Aligning with positioning target:', { targetRect, left, width });
  } else {
    // Fallback to search input positioning
    left = rect.left + scrollLeft;
    width = Math.max(rect.width, 400);
    console.log('Query Analyzer: Using search input positioning as fallback');
  }
  
  // Use fixed positioning to avoid overlapping with existing content
  overlay.style.position = 'fixed';
  overlay.style.top = (rect.bottom + 10) + 'px'; // 10px below search bar
  overlay.style.left = left + 'px';
  overlay.style.width = width + 'px';
  overlay.style.maxWidth = width + 'px';
  overlay.style.zIndex = '10000';
  
  // Ensure the overlay is visible
  overlay.style.display = 'block';
  
  // Debug logging
  console.log('Query Analyzer: Final overlay positioning:', { 
    top: rect.bottom + 10, 
    left, 
    width, 
    searchInputRect: rect,
    scrollTop,
    scrollLeft 
  });
}

// Function to analyze a query
async function analyzeQuery(query, searchInput) {
  if (isAnalyzing) return;
  
  isAnalyzing = true;
  currentSearchInput = searchInput;
  
  let overlay = document.getElementById('controversial-checker-overlay');
  if (!overlay) {
    overlay = createAnalysisOverlay();
  }
  
  // Position overlay underneath the search input
  positionOverlayUnderSearch(overlay, searchInput);
  
  const loading = document.getElementById('loading');
  const results = document.getElementById('results');
  
  overlay.style.display = 'block';
  loading.style.display = 'block';
  results.style.display = 'none';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkControversial',
      query: query
    });
    
    if (response.success) {
      displayResults(response.data, query);
    } else {
      displayError(response.error);
    }
  } catch (error) {
    displayError('Failed to analyze query: ' + error.message);
  } finally {
    isAnalyzing = false;
    loading.style.display = 'none';
  }
}

// Function to display analysis results
function displayResults(data, query) {
  console.log('Query Analyzer: Displaying results for query:', query);
  
  // Try to insert as a search result first
  const inserted = insertAnalysisAsSearchResult(query, data);
  
  if (inserted) {
    console.log('Query Analyzer: Successfully inserted analysis as search result');
    // Hide the old overlay if it exists
    const overlay = document.getElementById('controversial-checker-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  } else {
    console.log('Query Analyzer: Failed to insert as search result, using overlay fallback');
    // Fallback to overlay display
    const results = document.getElementById('results');
    const isControversial = data.isControversial;
    const confidence = Math.round(data.confidence * 100);
    
    // Update overlay border color based on controversial status
    const overlay = document.getElementById('controversial-checker-overlay');
    if (overlay) {
      overlay.style.borderColor = isControversial ? '#ff6b6b' : '#51cf66';
    }
    
    // Always show the overlay, regardless of controversial status
    let html = `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: bold; margin-right: 8px; font-size: 12px;">Status:</span>
          <span style="padding: 3px 6px; border-radius: 3px; background: ${isControversial ? '#ff6b6b' : '#51cf66'}; color: white; font-size: 11px;">
            ${isControversial ? 'Controversial' : 'Non-Controversial'} (${confidence}% confidence)
          </span>
        </div>
      </div>
    `;
    
    if (isControversial && data.controversialViewpoints && data.controversialViewpoints.length > 0) {
      console.log("setting html to viewpoints greater than 1")
      html += `
        <div style="margin-bottom: 12px;">
          <h5 style="margin: 0 0 6px 0; color: #333; font-size: 12px;">Different Viewpoints:</h5>
          <div style="font-size: 11px; color: #555; line-height: 1.4;">
            ${data.controversialViewpoints.map((viewpoint, index) => 
              `<div style="margin-bottom: 8px; padding: 6px; background: #f8f9fa; border-left: 3px solid #007bff; border-radius: 2px;">
                <strong>Viewpoint ${index + 1}:</strong> ${viewpoint}
              </div>`
            ).join('')}
          </div>
        </div>
      `;
    } else if (!isControversial) {
      html += `
        <div style="margin-bottom: 12px;">
          <div style="padding: 8px; background: #f0f8f0; border-left: 3px solid #51cf66; border-radius: 2px; font-size: 11px; color: #2d5a2d;">
            <strong>Analysis:</strong> This query appears to be on a non-controversial topic. The content is generally accepted and doesn't present significant opposing viewpoints or contentious issues.
          </div>
        </div>
      `;
    }
    
    if (data.manipulationDetected && data.manipulationIndicators && data.manipulationIndicators.length > 0) {
      html += `
        <div style="margin-bottom: 12px;">
          <h5 style="margin: 0 0 6px 0; color: #ff6b6b; font-size: 12px;">⚠️ Manipulation Detected:</h5>
          <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #ff6b6b;">
            ${data.manipulationIndicators.map(indicator => `<li>${indicator}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    console.log(results)
    results.innerHTML = html;
    console.log(results)

    results.style.display = 'block';
  }
}

// Function to display error
function displayError(error) {
  const results = document.getElementById('results');
  results.innerHTML = `
    <div style="color: #ff6b6b; text-align: center; font-size: 11px;">
      <p>❌ Error: ${error}</p>
    </div>
  `;
  results.style.display = 'block';
}

// Function to insert analysis as a search result
function insertAnalysisAsSearchResult(query, data) {
  console.log('Query Analyzer: Inserting analysis as search result...');
  
  // Find the search results container with better detection
  const resultsContainer = findBestResultsContainer();
  
  if (!resultsContainer) {
    console.log('Query Analyzer: No results container found, using fallback positioning');
    return false;
  }
  
  console.log('Query Analyzer: Found results container:', resultsContainer);
  console.log('Query Analyzer: Container tag name:', resultsContainer.tagName);
  console.log('Query Analyzer: Container ID:', resultsContainer.id);
  console.log('Query Analyzer: Container classes:', resultsContainer.className);
  
  // Create the analysis result element
  const analysisResult = document.createElement('div');
  analysisResult.id = 'query-analyzer-result';
  analysisResult.style.cssText = `
    background: white;
    border: 2px solid ${data.isControversial ? '#ff6b6b' : '#51cf66'};
    border-radius: 8px;
    padding: 20px;
    margin: 20px auto;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    font-family: Arial, sans-serif;
    max-width: 800px;
    width: 90%;
    box-sizing: border-box;
    position: relative;
    z-index: 1000;
  `;
  
  // Try to position it near the search results
  const searchArea = document.querySelector('#main, #center_col, #search, #rso');
  if (searchArea) {
    const rect = searchArea.getBoundingClientRect();
    if (rect.top > 0) {
      analysisResult.style.marginTop = (rect.top + 20) + 'px';
    }
  }
  
  const isControversial = data.isControversial;
  const confidence = Math.round(data.confidence * 100);
  
  console.log("data is controversial: ", data.isControversial);
  console.log("data viewpoints: ", data.controversialViewpoints);
  
  // Build the analysis content
  let html = `
    <div style="margin-bottom: 15px;">
      <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">🔍 Query Analysis</h3>
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <span style="font-weight: bold; margin-right: 10px; font-size: 14px;">Status:</span>
        <span style="padding: 5px 10px; border-radius: 5px; background: ${isControversial ? '#ff6b6b' : '#51cf66'}; color: white; font-size: 13px;">
          ${isControversial ? 'Controversial' : 'Non-Controversial'} (${confidence}% confidence)
        </span>
      </div>
    </div>
  `;
  
  if (isControversial && data.controversialViewpoints && data.controversialViewpoints.length > 0) {
    console.log("setting html to viewpoints greater than 1");
    console.log("Raw viewpoints data:", data.controversialViewpoints);
    
    html += `
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Different Viewpoints:</h4>
        <div style="font-size: 14px; color: #555; line-height: 1.6;">
          ${data.controversialViewpoints.map((viewpoint, index) => {
            // Handle both string and object formats
            let viewpointText = viewpoint;
            if (typeof viewpoint === 'object' && viewpoint !== null) {
              // If it's an object, try to extract text from common properties
              viewpointText = viewpoint.text || viewpoint.content || viewpoint.viewpoint || viewpoint.message || JSON.stringify(viewpoint);
              console.log(`Viewpoint ${index + 1} was an object, extracted:`, viewpointText);
            } else if (typeof viewpoint !== 'string') {
              // If it's not a string, convert it
              viewpointText = String(viewpoint);
              console.log(`Viewpoint ${index + 1} was not a string, converted:`, viewpointText);
            }
            
            return `<div style="margin-bottom: 15px; padding: 12px; background: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px;">
              <strong style="color: #007bff;">Viewpoint ${index + 1}:</strong><br>
              ${viewpointText}
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  } else if (!isControversial) {
    html += `
      <div style="margin-bottom: 20px;">
        <div style="padding: 15px; background: #f0f8f0; border-left: 4px solid #51cf66; border-radius: 4px; font-size: 14px; color: #2d5a2d;">
          <strong>Analysis:</strong> This query appears to be on a non-controversial topic. The content is generally accepted and doesn't present significant opposing viewpoints or contentious issues.
        </div>
      </div>
    `;
  }
  
  if (data.manipulationDetected && data.manipulationIndicators && data.manipulationIndicators.length > 0) {
    html += `
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #ff6b6b; font-size: 16px;">⚠️ Manipulation Detected:</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #ff6b6b;">
          ${data.manipulationIndicators.map(indicator => `<li>${indicator}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  console.log("html: ", html);
  analysisResult.innerHTML = html;
  
  // Use a completely different insertion approach to avoid parent-child issues
  try {
    // Try to insert into the results container first
    if (resultsContainer && resultsContainer !== document.body) {
      // Simple append to the beginning of the container
      resultsContainer.insertBefore(analysisResult, resultsContainer.firstChild);
      console.log('Query Analyzer: Analysis inserted at beginning of results container');
    } else {
      // Fallback: insert into body at the top of search results area
      const searchArea = document.querySelector('#main, #center_col, #search, #rso');
      if (searchArea && searchArea.parentNode) {
        searchArea.parentNode.insertBefore(analysisResult, searchArea);
        console.log('Query Analyzer: Analysis inserted before search area');
      } else {
        // Last resort: append to body
        document.body.appendChild(analysisResult);
        console.log('Query Analyzer: Analysis appended to body as fallback');
      }
    }
  } catch (error) {
    console.log('Query Analyzer: Error during insertion, using body fallback:', error);
    // Ultimate fallback: just append to body
    try {
      document.body.appendChild(analysisResult);
      console.log('Query Analyzer: Analysis appended to body using ultimate fallback');
    } catch (bodyError) {
      console.log('Query Analyzer: Even body insertion failed:', bodyError);
      return false;
    }
  }
  
  // Verify the element was actually added to the DOM
  const addedElement = document.getElementById('query-analyzer-result');
  if (addedElement) {
    console.log('Query Analyzer: Analysis element successfully added to DOM:', addedElement);
    return true;
  } else {
    console.log('Query Analyzer: Failed to add analysis element to DOM');
    return false;
  }
}

// Function to find the best results container
function findBestResultsContainer() {
  // Priority order for finding the best results container
  const selectors = [
    '#rso', // Main results container
    '#search', // Search container
    '#main', // Main content area
    '#center_col', // Center column
    '.search', // Search class
    '[role="main"]', // Main role
    '.g', // Individual result container
    'body' // Fallback to body
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log('Query Analyzer: Found container with selector:', selector, element);
      return element;
    }
  }
  
  console.log('Query Analyzer: No results container found');
  return null;
}

// Monitor URL changes to detect when search results page loads
function monitorUrlChanges() {
  let currentUrl = window.location.href;
  
  // Check for URL changes every 500ms
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      console.log('Query Analyzer: URL changed from', currentUrl, 'to', window.location.href);
      currentUrl = window.location.href;
      
      // If we're on a search results page, try to extract the query
      if (window.location.href.includes('/search?') || window.location.href.includes('&q=')) {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query && query.length > 3) {
          console.log('Query Analyzer: Detected search query from URL:', query);
          
          // Wait a bit for the page to fully load, then find the search input
          setTimeout(() => {
            findAndAnalyzeQuery(query);
          }, 1500);
        }
      }
    }
  }, 500);
}

// Function to find the best positioning target for alignment with search results
function findBestPositioningTarget() {
  // Priority order for finding the best positioning target
  const selectors = [
    '#main', // Google's main content area
    '#center_col', // Google's center column
    '.main', // Main content class
    '[role="main"]', // Main role attribute
    '#search', // Search results container
    '.search', // Search class
    '#rso', // Results container
    'input[name="q"]' // Search input as fallback
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log('Query Analyzer: Found positioning target:', selector, element);
      return element;
    }
  }
  
  console.log('Query Analyzer: No positioning target found, using body');
  return document.body;
}

// Function to find the search input and analyze the query
function findAndAnalyzeQuery(query) {
  console.log('Query Analyzer: Looking for search input to position overlay...');
  
  // Multiple selectors to find the Google search input
  const searchSelectors = [
    'input[name="q"]',
    'input[aria-label*="Search"]',
    'input[placeholder*="Search Google"]',
    'textarea[name="q"]',
    'input[type="search"]',
    'input[data-ved]', // Google specific attribute
    'input[jsaction*="search"]' // Google specific attribute
  ];
  
  let searchInput = null;
  
  // Try each selector
  for (const selector of searchSelectors) {
    const input = document.querySelector(selector);
    if (input) {
      searchInput = input;
      console.log('Query Analyzer: Found search input with selector:', selector, input);
      break;
    }
  }
  
  if (searchInput) {
    console.log('Query Analyzer: Search input found, analyzing query:', query);
    analyzeQuery(query, searchInput);
  } else {
    console.log('Query Analyzer: No search input found, using fallback positioning');
    // Analyze without positioning (will use fallback)
    analyzeQuery(query, null);
  }
  
  // Also try to find and log the results container for debugging
  const resultsContainer = document.querySelector('#rso, #search, .search, #main, #center_col');
  if (resultsContainer) {
    console.log('Query Analyzer: Results container found:', resultsContainer);
    console.log('Query Analyzer: Results container children count:', resultsContainer.children.length);
  } else {
    console.log('Query Analyzer: No results container found');
  }
}

// Function to reposition overlay on scroll/resize
function repositionOverlay() {
  const overlay = document.getElementById('controversial-checker-overlay');
  if (overlay && overlay.style.display !== 'none' && currentSearchInput) {
    positionOverlayUnderSearch(overlay, currentSearchInput);
  }
}

// Add event listeners for repositioning
window.addEventListener('scroll', repositionOverlay);
window.addEventListener('resize', repositionOverlay);

// Function to check if we're on a search results page and analyze if needed
function checkCurrentPage() {
  if (window.location.hostname.includes('google.com')) {
    // Check if we're already on a search results page
    if (window.location.href.includes('/search?') || window.location.href.includes('&q=')) {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get('q');
      if (query && query.length > 3) {
        console.log('Query Analyzer: Already on search results page, analyzing query:', query);
        setTimeout(() => {
          findAndAnalyzeQuery(query);
        }, 1000);
      }
    }
  }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Query Analyzer: DOM loaded, initializing...');
    checkCurrentPage(); // Check if we're already on a search page
    monitorUrlChanges(); // Start URL monitoring
    addExtensionIndicator(); // Add indicator on load
  });
} else {
  console.log('Query Analyzer: DOM already loaded, initializing...');
  checkCurrentPage(); // Check if we're already on a search page
  monitorUrlChanges(); // Start URL monitoring
  addExtensionIndicator(); // Add indicator on load
}

// Also run on dynamic content changes (for Google's dynamic loading)
const observer = new MutationObserver((mutations) => {
  if (window.location.hostname.includes('google.com')) {
    console.log('Query Analyzer: DOM changed, re-detecting...');
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Simple extension status check
console.log('Query Analyzer: Content script loaded on', window.location.hostname);
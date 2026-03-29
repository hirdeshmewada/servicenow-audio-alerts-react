// ServiceNow Content Script
// Injects functionality into ServiceNow pages

console.log('🎯 ServiceNow Audio Alerts content script loaded');

// Check if we're on a ServiceNow page
if (window.location.hostname.includes('service-now.com')) {
  initializeContentScript();
}

function initializeContentScript() {
  // Add floating indicator for queue monitoring
  createFloatingIndicator();
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Content script received message:', message);
    
    switch (message.action) {
      case 'highlightQueue':
        highlightQueueElements();
        break;
      case 'getQueueInfo':
        const queueInfo = getQueueInfoFromPage();
        sendResponse(queueInfo);
        break;
      default:
        console.log('Unknown message action:', message.action);
    }
  });
}

function createFloatingIndicator() {
  // Create a small floating indicator showing monitoring status
  const indicator = document.createElement('div');
  indicator.id = 'snow-alerts-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 8px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  `;
  
  indicator.innerHTML = '🔊 SNOW Alerts';
  
  indicator.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  indicator.addEventListener('mouseenter', () => {
    indicator.style.transform = 'scale(1.05)';
  });
  
  indicator.addEventListener('mouseleave', () => {
    indicator.style.transform = 'scale(1)';
  });
  
  document.body.appendChild(indicator);
  
  // Update indicator status
  updateIndicatorStatus();
}

function updateIndicatorStatus() {
  chrome.storage.local.get(['isMonitoring'], (result) => {
    const indicator = document.getElementById('snow-alerts-indicator');
    if (indicator) {
      const isMonitoring = result.isMonitoring || false;
      indicator.innerHTML = isMonitoring ? '🟢 SNOW Active' : '🔴 SNOW Stopped';
      indicator.style.background = isMonitoring 
        ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
        : 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)';
    }
  });
}

function highlightQueueElements() {
  // Highlight queue-related elements on the page
  const queueElements = document.querySelectorAll('[data-sysparm_query], .list2_body, .table-row');
  
  queueElements.forEach(element => {
    element.style.transition = 'all 0.3s ease';
    element.style.boxShadow = '0 0 0 2px #007bff';
    element.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
    
    setTimeout(() => {
      element.style.boxShadow = '';
      element.style.backgroundColor = '';
    }, 2000);
  });
}

function getQueueInfoFromPage() {
  // Extract queue information from the current ServiceNow page
  const queueInfo = {
    url: window.location.href,
    title: document.title,
    tableName: getTableName(),
    query: getQueryFromURL(),
    recordCount: getRecordCount()
  };
  
  return queueInfo;
}

function getTableName() {
  // Try to extract table name from URL or page content
  const urlParams = new URLSearchParams(window.location.search);
  const sysparmTable = urlParams.get('sysparm_table');
  
  if (sysparmTable) {
    return sysparmTable;
  }
  
  // Try to get from breadcrumbs or other page elements
  const breadcrumb = document.querySelector('.breadcrumb');
  if (breadcrumb) {
    const links = breadcrumb.querySelectorAll('a');
    if (links.length > 0) {
      return links[links.length - 1].textContent.trim();
    }
  }
  
  return 'unknown';
}

function getQueryFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('sysparm_query') || '';
}

function getRecordCount() {
  // Try to get record count from page
  const countElement = document.querySelector('.record_count, .list2_count, [data-count]');
  if (countElement) {
    const countText = countElement.textContent.trim();
    const match = countText.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }
  
  // Try to count table rows
  const tableRows = document.querySelectorAll('table tr:not(:first-child)');
  return tableRows.length;
}

// Listen for storage changes to update indicator
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.isMonitoring) {
    updateIndicatorStatus();
  }
});

// Add keyboard shortcuts
document.addEventListener('keydown', (event) => {
  // Ctrl+Shift+S to open options
  if (event.ctrlKey && event.shiftKey && event.key === 'S') {
    event.preventDefault();
    chrome.runtime.openOptionsPage();
  }
  
  // Ctrl+Shift+T to test audio
  if (event.ctrlKey && event.shiftKey && event.key === 'T') {
    event.preventDefault();
    chrome.runtime.sendMessage({ action: 'testAudio' });
  }
});

console.log('🎯 ServiceNow content script initialized');

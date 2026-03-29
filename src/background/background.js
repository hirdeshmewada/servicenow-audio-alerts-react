// ServiceNow Audio Alerts - Background Service Worker (Manifest V3)
// Self-contained - no external imports to avoid webpack issues

// Get settings directly from storage
async function getSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    return result.settings || {
      pollInterval: 5,
      disableAlarm: false,
      disablePolling: false,
      alertCondition: 'nonZeroCount',
      volume: 70,
      playbackDuration: 5,
      loopAudio: false,
      enableDesktop: true,
      enableSound: true,
      quietHours: false,
      quietStart: '22:00',
      quietEnd: '08:00',
      showTicketDetails: true
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return {};
  }
}

// Initialize service worker
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL("options.html")
      });
      console.log('🚀 ServiceNow Audio Alerts installed');
    } catch (error) {
      console.error('❌ Error opening options page:', error);
    }
  }
});

// Main message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message.type || message.action);
  
  // Handle testAudio/PLAY_AUDIO messages
  if (message.type === 'testAudio' || message.action === 'testAudio' || message.type === 'PLAY_AUDIO') {
    console.log('🔊 Audio request received');
    
    handlePlayAudio(message.settings || {})
      .then(() => {
        console.log('✅ Audio played successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('❌ Audio failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep channel open for async
  }
  
  // Handle STOP_AUDIO message
  if (message.type === 'STOP_AUDIO') {
    console.log('🔇 Stop audio request received');
    chrome.runtime.sendMessage({ type: "STOP_AUDIO" }).catch(() => {});
    sendResponse({ success: true });
    return true;
  }
  
  // Handle monitoring messages
  if (message.type === 'START_MONITORING' || message.type === 'startMonitoring') {
    startMonitoring().then(() => sendResponse({ success: true })).catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (message.type === 'STOP_MONITORING' || message.type === 'stopMonitoring') {
    stopMonitoring().then(() => sendResponse({ success: true })).catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (message.type === 'GET_MONITORING_STATUS' || message.type === 'getMonitoringStatus') {
    getMonitoringStatus().then(status => sendResponse({ status })).catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  // Default: unknown message type
  sendResponse({ success: false, error: 'Unknown message type' });
  return true;
});

// Handle audio playback
async function handlePlayAudio(settings) {
  try {
    // Get default settings
    const defaultSettings = await getSettings();
    
    // Merge provided settings with defaults
    const finalSettings = {
      volume: settings.volume || defaultSettings.volume || 70,
      duration: (settings.playbackDuration || settings.duration || defaultSettings.playbackDuration || 5) * 1000,
      loop: settings.loopAudio || settings.loop || defaultSettings.loopAudio || false
    };
    
    // Get custom audio data if available
    let audioData = null;
    if (defaultSettings.audioSource === 'custom') {
      const audioResult = await chrome.storage.local.get(['audioData']);
      if (audioResult.audioData) {
        audioData = audioResult.audioData;
        console.log('🎵 Using custom audio:', audioData.name);
      }
    }
    
    console.log('🔧 Audio settings:', finalSettings);
    
    // Create offscreen document if it doesn't exist
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingContexts.length === 0) {
      console.log('🔧 Creating offscreen document...');
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('offscreen.html'),
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Playing audio notifications'
      });
      console.log('✅ Offscreen document created');
    }

    // Send message to offscreen document
    const audioMessage = {
      type: "PLAY_AUDIO",
      audioData: audioData,
      settings: finalSettings
    };

    console.log('📤 Sending audio message:', audioMessage);
    
    // Fire and forget
    chrome.runtime.sendMessage(audioMessage).catch(err => {
      console.log('⚠️ Offscreen message error:', err.message);
    });
    
    console.log('✅ Audio playback initiated');
    
  } catch (error) {
    console.error('❌ Error in handlePlayAudio:', error);
    throw error;
  }
}

// Alarm handler for polling
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'queuePoll') {
    await pollQueues();
  }
});

// Start monitoring
async function startMonitoring() {
  try {
    console.log('▶️ Starting monitoring');
    const settings = await getSettings();
    const pollInterval = settings.pollInterval || 5;
    
    await chrome.alarms.clear('queuePoll');
    await chrome.alarms.create('queuePoll', {
      delayInMinutes: 0.1,
      periodInMinutes: pollInterval
    });
    
    await chrome.storage.local.set({ isMonitoring: true });
    await pollQueues();
    
    console.log('✅ Monitoring started');
  } catch (error) {
    console.error('❌ Error starting monitoring:', error);
  }
}

// Stop monitoring
async function stopMonitoring() {
  try {
    console.log('⏸️ Stopping monitoring');
    await chrome.alarms.clear('queuePoll');
    await chrome.storage.local.set({ isMonitoring: false });
    console.log('✅ Monitoring stopped');
  } catch (error) {
    console.error('❌ Error stopping monitoring:', error);
  }
}

// Get monitoring status
async function getMonitoringStatus() {
  try {
    const result = await chrome.storage.local.get(['isMonitoring']);
    return result.isMonitoring || false;
  } catch (error) {
    console.error('❌ Error getting monitoring status:', error);
    return false;
  }
}

// Poll queues for updates
async function pollQueues() {
  try {
    console.log('🔍 Polling queues...');
    const data = await chrome.storage.local.get(['queues', 'settings', 'previousCounts']);
    const { queues = [], settings = {}, previousCounts = {} } = data;
    
    if (settings.disablePolling) {
      console.log('⏸️ Polling disabled');
      return;
    }
    
    const newCounts = {};
    const lastPollAt = new Date().toISOString();
    
    for (const queue of queues) {
      if (!queue.enabled || !queue.url) continue;
      
      try {
        const result = await fetchQueueData(queue.url);
        const count = result.quantity;
        newCounts[queue.id] = count;
        
        queue.currentCount = count;
        queue.lastUpdated = lastPollAt;
        queue.records = result.records || [];
        
        const previousCount = previousCounts[queue.id] || 0;
        
        if (shouldAlert(count, previousCount, settings.alertCondition)) {
          await handleAlert(queue, result, settings);
        }
      } catch (error) {
        console.error(`❌ Error polling ${queue.name}:`, error);
        queue.currentCount = 0;
        queue.error = error.message;
      }
    }
    
    await chrome.storage.local.set({ 
      previousCounts: newCounts,
      queues: queues,
      lastPollAt: lastPollAt
    });
    
    updateBadge(queues, newCounts);
    console.log('✅ Polling complete');
  } catch (error) {
    console.error('❌ Error polling queues:', error);
  }
}

// Progressive decoding for multiple encoding levels (matches old extension)
function progressiveDecode(encodedString) {
  let decoded = encodedString;
  let previousDecoded;
  let decodeCount = 0;
  const maxDecodes = 5;
  
  do {
    previousDecoded = decoded;
    try {
      decoded = decodeURIComponent(decoded);
      decodeCount++;
    } catch (e) {
      break;
    }
  } while (decoded !== previousDecoded && decodeCount < maxDecodes);
  
  return decoded;
}

// Extract ServiceNow query from URL (matches old extension exactly)
function extractServiceNowQuery(url) {
  try {
    // Handle both encoded and non-encoded URLs
    let workingUrl = url;
    
    // Decode URL first if it's encoded
    if (url.includes('%')) {
      workingUrl = progressiveDecode(url);
    }
    
    // Extract sysparm_query using multiple patterns (exactly like old extension)
    const patterns = [
      /sysparm_query=([^&]*)/,
      /sysparm_query%3D([^&]*)/,
      /sysparm_query%253D([^&]*)/,
      /[?&]sysparm_query=([^&]*)/
    ];
    
    for (const pattern of patterns) {
      const match = workingUrl.match(pattern);
      if (match) {
        let query = match[1];
        // Additional decode if needed
        if (query.includes('%')) {
          query = progressiveDecode(query);
        }
        return query;
      }
    }
    
    console.warn('Could not extract sysparm_query from URL');
    return '';
  } catch (error) {
    console.error('Error extracting ServiceNow query:', error);
    return '';
  }
}

// Convert ServiceNow UI URL to API URL (matches old extension exactly)
function convertToApiUrl(url) {
  try {
    console.log('=== URL CONVERSION ===');
    console.log('Input URL:', url);
    
    // Handle new ServiceNow UI URLs with /now/nav/ui/classic/params/target/
    let processedUrl = url;
    if (url.includes('/now/nav/ui/classic/params/target/')) {
      console.log('Detected new ServiceNow UI URL, processing...');
      
      const targetMatch = url.match(/params\/target\/(.+)$/);
      if (targetMatch) {
        let targetUrl = targetMatch[1];
        
        // Progressive decoding - handle multiple encoding levels (exactly like old extension)
        let decodedUrl = progressiveDecode(targetUrl);
        console.log('Progressively decoded URL:', decodedUrl);
        
        // Rebuild full URL
        const urlMatch = url.match(/(https:\/\/[^\/]+)/);
        if (urlMatch) {
          processedUrl = urlMatch[1] + '/' + decodedUrl;
          console.log('Rebuilt URL:', processedUrl);
        }
      }
    }
    
    // Validate it's a ServiceNow URL
    const urlObj = new URL(processedUrl);
    if (!urlObj.hostname.includes('service-now.com')) {
      console.warn('URL does not appear to be a ServiceNow instance:', processedUrl);
      return undefined;
    }

    // Extract ServiceNow query parameters safely (exactly like old extension)
    const serviceNowQuery = extractServiceNowQuery(processedUrl);
    console.log('Extracted ServiceNow query:', serviceNowQuery);
    
    // Build REST API URL with proper encoding (exactly like old extension)
    let restURL = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    
    // Add ServiceNow query with proper encoding to preserve & characters
    if (serviceNowQuery) {
      restURL += '?sysparm_query=' + encodeURIComponent(serviceNowQuery);
    }
    
    // Add REST API parameters (JSONv2 format like old extension)
    const separator = serviceNowQuery ? '&' : '?';
    restURL += `${separator}JSONv2&sysparm_fields=number,severity,short_description,priority,sys_id,sys_updated_on,account,assigned_to,state,u_next_step_date_and_time,impact,category,opened_by,assignment_group,u_first_assignment_group,u_service_downtime_started,u_service_downtime_end,u_fault_cause,resolved_by,resolved_at,u_resolved,u_resolved_by,sys_mod_count`;
    
    console.log('Final REST API URL:', restURL);
    return restURL;
  } catch (error) {
    console.error('❌ Error converting URL:', error);
    return undefined;
  }
}

// Fetch queue data from ServiceNow
async function fetchQueueData(url) {
  try {
    // Convert UI URL to API URL if needed
    const apiUrl = convertToApiUrl(url);
    
    console.log('🔍 Fetching data from:', apiUrl);
    const response = await fetch(apiUrl + (apiUrl.includes('?') ? '&' : '?') + 'sysparm_limit=1000', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // Check if response is HTML (login page or error)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('❌ Received HTML response instead of JSON. URL may require authentication or be incorrect.');
      return {
        quantity: 0,
        records: [],
        timestamp: Date.now()
      };
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const records = data.result || data.records || [];
    
    console.log('📊 API Response:', {
      url: apiUrl,
      quantity: records.length,
      records: records.slice(0, 3) // Log first 3 records only
    });
    
    return {
      quantity: records.length,
      records: records,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('❌ API Error:', error);
    return {
      quantity: 0,
      records: [],
      timestamp: Date.now()
    };
  }
}

// Check if we should send an alert
function shouldAlert(currentCount, previousCount, alertCondition) {
  switch (alertCondition) {
    case 'newTicket':
      return currentCount > previousCount;
    case 'nonZeroCount':
    default:
      return currentCount > 0;
  }
}

// Handle alert for queue
async function handleAlert(queue, result, settings) {
  try {
    console.log('🚨 Alert for:', queue.name);
    
    const latestTicket = result.records && result.records.length > 0 ? result.records[0] : null;
    
    if (latestTicket) {
      await showNotification(
        latestTicket.number,
        latestTicket.short_description,
        latestTicket.severity,
        queue.notificationText || null,
        queue.url
      );
    }
    
    // Play audio only if not disabled
    if (!settings.disableAlarm) {
      await handlePlayAudio({
        loop: settings.loopAudio !== false,
        volume: settings.volume || 70,
        playbackDuration: settings.playbackDuration || 5
      });
    }
  } catch (error) {
    console.error('❌ Error handling alert:', error);
  }
}

// Show notification
async function showNotification(ticketNumber, ticketDescription, severity, customTitle, queueUrl) {
  try {
    const title = customTitle || ticketNumber;
    let iconUrl;
    
    const sev = parseInt(severity) || 5;
    switch (sev) {
      case 1: iconUrl = chrome.runtime.getURL('icons/Sev1.png'); break;
      case 2: iconUrl = chrome.runtime.getURL('icons/Sev2.png'); break;
      case 3: iconUrl = chrome.runtime.getURL('icons/Sev3.png'); break;
      default: iconUrl = chrome.runtime.getURL('icons/ITSM128.png');
    }
    
    const notificationId = await chrome.notifications.create({
      type: 'basic',
      iconUrl: iconUrl,
      title: title,
      message: ticketDescription || 'New ticket alert',
      requireInteraction: true,
      isClickable: true,
      buttons: [{ title: '❌ Close' }]
    });
    
    if (queueUrl) {
      await chrome.storage.local.set({ [`notification_${notificationId}`]: queueUrl });
    }
    
    // Auto-clear after 8 seconds
    setTimeout(() => {
      chrome.notifications.clear(notificationId);
      chrome.storage.local.remove(`notification_${notificationId}`);
    }, 8000);
    
    return notificationId;
  } catch (error) {
    console.error('❌ Error showing notification:', error);
    return null;
  }
}

// Update extension badge
async function updateBadge(queues, counts) {
  try {
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    chrome.action.setBadgeText({ text: total.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#FF6B6B' });
  } catch (error) {
    console.error('❌ Error updating badge:', error);
  }
}

// Storage change listener
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'local' && changes.isMonitoring) {
    const isMonitoring = changes.isMonitoring.newValue;
    if (isMonitoring) {
      await startMonitoring();
    } else {
      await stopMonitoring();
    }
  }
});

console.log('🎯 ServiceNow Audio Alerts background service worker loaded');

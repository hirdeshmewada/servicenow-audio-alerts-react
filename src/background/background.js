// ServiceNow Audio Alerts - Background Service Worker (Manifest V3)
// Self-contained - no external imports to avoid webpack issues

// Get settings from storage
async function getSettings() {
  try {
    console.log('📋 Loading settings from storage...');
    // Use chrome.storage.sync for settings like old extension
    const result = await chrome.storage.sync.get([
      'pollInterval', 'disableAlarm', 'disablePolling', 'alertCondition',
      'volume', 'playbackDuration', 'loopAudio', 'enableDesktop', 'enableSound', 'quietHours', 'quietStart', 'quietEnd', 'showTicketDetails'
    ]);
    
    const settings = {
      pollInterval: result.pollInterval || 5,
      disableAlarm: result.disableAlarm || false,
      disablePolling: result.disablePolling || false,
      alertCondition: result.alertCondition || 'nonZeroCount',
      volume: result.volume || 70,
      playbackDuration: result.playbackDuration || 5,
      loopAudio: result.loopAudio || false,
      enableDesktop: result.enableDesktop || true,
      enableSound: result.enableSound || true,
      quietHours: result.quietHours || false,
      quietStart: result.quietStart || '22:00',
      quietEnd: result.quietEnd || '08:00',
      showTicketDetails: result.showTicketDetails || true
    };
    
    console.log('✅ Settings loaded:', settings);
    return settings;
  } catch (error) {
    console.error('❌ Error getting settings:', error);
    return {
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

// Direct function to stop audio without message loop
async function stopAudioDirectly() {
  try {
    console.log('🔇 Stopping audio directly');
    // Send to offscreen document
    chrome.runtime.sendMessage({ type: "STOP_AUDIO" }).catch(() => {
      console.log('Offscreen document not found or already stopped');
    });
  } catch (error) {
    console.error('❌ Error stopping audio directly:', error);
  }
}

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
  
  // Handle STOP_AUDIO message (from popup/test)
  if (message.type === 'STOP_AUDIO') {
    console.log('🔇 Stop audio request received');
    stopAudioDirectly();
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
    console.log('=== STARTING MONITORING ===');
    const settings = await getSettings();
    const pollInterval = settings.pollInterval || 5;
    console.log('Poll interval:', pollInterval, 'minutes');
    
    await chrome.alarms.clear('queuePoll');
    await chrome.alarms.create('queuePoll', {
      delayInMinutes: 0.1,
      periodInMinutes: pollInterval
    });
    
    const nextPollAt = new Date(Date.now() + pollInterval * 60 * 1000).toISOString();
    
    // Save monitoring state to local storage (runtime data)
    await chrome.storage.local.set({ 
      isMonitoring: true,
      nextPollAt: nextPollAt
    });
    
    // Save pollInterval to sync storage (settings)
    await chrome.storage.sync.set({ 
      pollInterval: pollInterval
    });
    
    // Update badge to show monitoring is active
    chrome.action.setBadgeText({ text: '...' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    
    console.log('Next poll scheduled for:', nextPollAt);
    await pollQueues();
    
    console.log('=== MONITORING STARTED ===');
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
    
    // Update badge to show monitoring is stopped
    chrome.action.setBadgeText({ text: 'Off' });
    chrome.action.setBadgeBackgroundColor({ color: '#999999' });
    
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
    console.log('=== POLLING QUEUES ===');
    const result = await chrome.storage.local.get(['queues', 'settings', 'previousCounts', 'oldTicketList', 'newTicketList']);
    let queues = result.queues || [];
    const settings = result.settings || {};
    const previousCounts = result.previousCounts || {};
    const oldTicketList = result.oldTicketList || [];
    const pollInterval = settings.pollInterval || 5;
    
    console.log('Current queues:', queues.length);
    console.log('Previous counts:', previousCounts);
    console.log('Old ticket list length:', oldTicketList.length);
    
    if (settings.disablePolling) {
      console.log('⏸️ Polling disabled');
      return;
    }
    
    const newCounts = {};
    const lastPollAt = new Date().toISOString();
    const nextPollAt = new Date(Date.now() + pollInterval * 60 * 1000).toISOString();
    let newTicketList = [];
    
    console.log('Last poll:', lastPollAt);
    console.log('Next poll:', nextPollAt);
    
    for (const queue of queues) {
      if (!queue.enabled || !queue.url) {
        console.log(`Skipping queue ${queue.name}: disabled or no URL`);
        continue;
      }
      
      try {
        console.log(`Polling queue: ${queue.name}`);
        const result = await fetchQueueData(queue.url);
        const count = result.quantity;
        newCounts[queue.id] = count;
        
        queue.currentCount = count;
        queue.lastUpdated = lastPollAt;
        queue.records = result.records || [];
        
        console.log(`Queue ${queue.name} count:`, count);
        
        // Extract ticket numbers from records (like old extension)
        const ticketNumbers = result.records ? result.records.map(r => r.number).filter(n => n) : [];
        newTicketList = [...newTicketList, ...ticketNumbers];
        console.log(`Queue ${queue.name} tickets:`, ticketNumbers);
        
        const previousCount = previousCounts[queue.id] || 0;
        
        // Check alert condition with proper logic (like old extension)
        if (shouldAlert(count, previousCount, settings.alertCondition, oldTicketList, newTicketList)) {
          console.log(`🚨 Alert triggered for ${queue.name}: ${previousCount} -> ${count}`);
          await handleAlert(queue, result, settings);
        }
      } catch (error) {
        console.error(`❌ Error polling ${queue.name}:`, error);
        queue.currentCount = 0;
        queue.error = error.message;
      }
    }
    
    // Update ticket lists for next comparison (like old extension)
    await chrome.storage.local.set({ 
      previousCounts: newCounts,
      queues: queues,
      lastPollAt: lastPollAt,
      nextPollAt: nextPollAt,
      oldTicketList: [...newTicketList], // Move current list to old for next cycle
      newTicketList: newTicketList
    });
    
    updateBadge(queues, newCounts);
    console.log('=== POLLING COMPLETE ===');
    console.log('New counts:', newCounts);
    
    // Calculate total tickets across all queues (like old extension)
    const totalCount = Object.values(newCounts).reduce((sum, count) => sum + count, 0);
    console.log('Total ticket count:', totalCount);
    console.log('Previous total count:', Object.values(previousCounts).reduce((sum, count) => sum + count, 0));
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

// Fetch queue data from ServiceNow (matches old extension exactly)
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
    
    // Console logging exactly like old extension
    console.log(`=== URL DATA DEBUG ===`);
    console.log(`URL: ${apiUrl}`);
    console.log(`Full response data:`, data);
    console.log(`Records array (main table):`, records);
    console.log(`Number of records: ${records.length}`);
    console.log(`=====================`);
    
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

// Check if we should send an alert (matches old extension logic)
function shouldAlert(currentCount, previousCount, alertCondition, oldTicketList = [], newTicketList = []) {
  console.log('=== NOTIFICATION LOGIC ===');
  console.log('Alert condition:', alertCondition);
  console.log('Current count:', currentCount);
  console.log('Previous count:', previousCount);
  console.log('Old ticket list length:', oldTicketList.length);
  console.log('New ticket list length:', newTicketList.length);
  
  switch (alertCondition) {
    case 'alarmOnNewEntry':
      // Check for new tickets by comparing lists (like old extension)
      console.log('=== NEW TICKET DETECTION LOGIC ===');
      console.log('Previous list:', oldTicketList);
      console.log('New list:', newTicketList);
      console.log('Previous list length:', oldTicketList.length);
      console.log('New list length:', newTicketList.length);
      
      // Find tickets that are in new list but not in old list
      const difference = newTicketList.filter(x => !oldTicketList.includes(x));
      console.log('New tickets detected (difference):', difference);
      
      // Only trigger if:
      // 1. This is not the first run (oldTicketList is not empty)
      // 2. There are actual new tickets (difference > 0)
      if (oldTicketList.length === 0) {
        console.log('🔄 First run - treating all tickets as existing');
        return false;
      }
      
      if (difference.length > 0) {
        console.log('✅ Triggering - new tickets condition met');
        console.log('New tickets:', difference);
        return true;
      } else {
        console.log('❌ No new tickets detected');
        return false;
      }
      
    case 'nonZeroCount':
    default:
      if (currentCount > 0) {
        console.log('✅ Triggering - count > 0 condition met');
        return true;
      } else {
        console.log('❌ No tickets - count is 0');
        return false;
      }
  }
}

// Handle alert for queue
async function handleAlert(queue, result, settings) {
  try {
    console.log('🚨 Alert for:', queue.name);
    
    // Play audio only if not disabled
    if (!settings.disableAlarm) {
      await handlePlayAudio({
        loop: settings.loopAudio !== false,
        volume: settings.volume || 70,
        playbackDuration: settings.playbackDuration || 5
      });
    }
    
    // Create notification for the queue
    const latestTicket = result.records && result.records.length > 0 ? result.records[0] : null;
    
    if (latestTicket) {
      // Determine notification title based on alert condition
      let customTitle;
      if (settings.alertCondition === 'nonZeroCount') {
        customTitle = queue.notificationText || 'Tickets Available';
      } else if (settings.alertCondition === 'alarmOnNewEntry') {
        customTitle = queue.notificationText || 'New tickets in Queue';
      }
      
      await showNotification(
        latestTicket.number,
        latestTicket.short_description,
        latestTicket.severity,
        customTitle,
        queue.url
      );
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
    
    // Auto-clear after 8 seconds (like old extension)
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
    
    // Get monitoring status
    const result = await chrome.storage.local.get(['isMonitoring']);
    const isMonitoring = result.isMonitoring || false;
    
    if (!isMonitoring) {
      chrome.action.setBadgeText({ text: 'Off' });
      chrome.action.setBadgeBackgroundColor({ color: '#999999' });
    } else if (total === 0) {
      chrome.action.setBadgeText({ text: '0' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
      chrome.action.setBadgeText({ text: total.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#FF6B6B' });
    }
  } catch (error) {
    console.error('❌ Error updating badge:', error);
  }
}

console.log('🎯 ServiceNow Audio Alerts background service worker loaded');

// Notification button click handler - stops audio when close button is clicked
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  console.log('🔔 Notification button clicked:', notificationId, 'Button index:', buttonIndex);
  
  try {
    if (buttonIndex === 0) {
      // Close button clicked
      console.log('❌ Close button clicked - stopping audio');
      await stopAudioDirectly();
      console.log('✅ Audio stopped via Close button');
      
      // Clear the notification
      chrome.notifications.clear(notificationId);
      chrome.storage.local.remove(`notification_${notificationId}`);
      console.log('🧹 Notification dismissed');
    }
  } catch (error) {
    console.error('❌ Error handling notification button click:', error);
  }
});

// Notification click handler - stops audio and opens queue URL
chrome.notifications.onClicked.addListener(async (notificationId) => {
  console.log('🔔 Notification clicked:', notificationId);
  
  try {
    // Stop audio when opening queue
    await stopAudioDirectly();
    console.log('✅ Audio stopped when opening queue');
    
    // Get the stored queue URL
    const result = await chrome.storage.local.get([`notification_${notificationId}`]);
    const queueUrl = result[`notification_${notificationId}`];
    
    if (queueUrl) {
      console.log('🌐 Opening queue URL:', queueUrl);
      await chrome.tabs.create({ url: queueUrl });
    }
    
    // Clear the notification
    chrome.notifications.clear(notificationId);
    chrome.storage.local.remove(`notification_${notificationId}`);
  } catch (error) {
    console.error('❌ Error handling notification click:', error);
  }
});

// Notification close handler - stops audio when notification is closed
chrome.notifications.onClosed.addListener(async (notificationId) => {
  console.log('🔔 Notification closed:', notificationId);
  
  try {
    // Stop audio when notification is closed
    await stopAudioDirectly();
    console.log('✅ Audio stopped due to notification close');
    
    // Clean up stored URL
    chrome.storage.local.remove(`notification_${notificationId}`);
  } catch (error) {
    console.error('❌ Error handling notification close:', error);
  }
});

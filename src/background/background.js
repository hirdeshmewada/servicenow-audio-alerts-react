// ServiceNow Audio Alerts - Modern Service Worker (Manifest V3)
// Migrated from original background.js with React compatibility

import { state, getState, updateState, initializeState } from '../services/stateManager.js';
import { fetchQueueData, processRecords } from '../services/servicenowAPI.js';
import { showNotification } from '../services/notificationSystem.js';
import { playAudio, stopAudio } from '../services/audioManager.js';

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
  
  // Initialize state
  await initializeState();
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('📨 Message received:', message);
  
  try {
    switch (message.action) {
      case 'startMonitoring':
        await startMonitoring();
        sendResponse({ success: true });
        break;
        
      case 'stopMonitoring':
        await stopMonitoring();
        sendResponse({ success: true });
        break;
        
      case 'getMonitoringStatus':
        const status = await getMonitoringStatus();
        sendResponse({ status });
        break;
        
      case 'testAudio':
        await playAudio();
        sendResponse({ success: true });
        break;
        
      case 'stopAudio':
        stopAudio();
        sendResponse({ success: true });
        break;
        
      default:
        console.warn('⚠️ Unknown message action:', message.action);
        sendResponse({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('❌ Error handling message:', error);
    sendResponse({ error: error.message });
  }
  
  return true; // Keep the message channel open for async response
});

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
    
    // Get settings
    const settings = await chrome.storage.local.get(['settings', 'queues']);
    const pollInterval = settings.settings?.pollInterval || 5;
    
    // Clear existing alarm
    await chrome.alarms.clear('queuePoll');
    
    // Create new alarm
    await chrome.alarms.create('queuePoll', {
      delayInMinutes: 1,
      periodInMinutes: pollInterval
    });
    
    // Update monitoring status
    await chrome.storage.local.set({ isMonitoring: true });
    
    // Initial poll
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
    
    // Clear alarm
    await chrome.alarms.clear('queuePoll');
    
    // Update monitoring status
    await chrome.storage.local.set({ isMonitoring: false });
    
    // Stop any playing audio
    stopAudio();
    
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
    console.log('🔍 Polling queues');
    
    const data = await chrome.storage.local.get(['queues', 'settings', 'previousCounts']);
    const { queues = [], settings = {}, previousCounts = {} } = data;
    
    if (settings.disablePolling) {
      console.log('⏸️ Polling is disabled');
      return;
    }
    
    let hasChanges = false;
    const newCounts = {};
    
    // Poll each queue
    for (const queue of queues) {
      if (!queue.enabled || !queue.url) continue;
      
      try {
        const result = await fetchQueueData(queue.url);
        const count = result.quantity;
        
        newCounts[queue.id] = count;
        
        // Check for changes
        const previousCount = previousCounts[queue.id] || 0;
        
        if (shouldAlert(count, previousCount, settings.alertCondition)) {
          await handleAlert(queue, result, settings);
        }
        
        // Update badge
        updateBadge(queues, newCounts);
        
      } catch (error) {
        console.error(`❌ Error polling queue ${queue.name}:`, error);
      }
    }
    
    // Save new counts
    await chrome.storage.local.set({ previousCounts: newCounts });
    
    console.log('✅ Queue polling completed');
  } catch (error) {
    console.error('❌ Error polling queues:', error);
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
    const message = queue.notificationText || `New tickets in ${queue.name}`;
    
    // Send notification
    if (!settings.disableAlarm) {
      await showNotification(
        'ServiceNow Alert',
        message,
        'info'
      );
    }
    
    // Play audio
    if (!settings.disableAlarm && settings.enableSound !== false) {
      await playAudio();
    }
    
    console.log('🚨 Alert sent for queue:', queue.name);
  } catch (error) {
    console.error('❌ Error handling alert:', error);
  }
}

// Update extension badge
async function updateBadge(queues, counts) {
  try {
    const settings = await chrome.storage.local.get(['settings']);
    const badgeDisplay = settings.settings?.badgeDisplay || 'false';
    
    if (badgeDisplay === 'true') {
      // Split display (A | B)
      const queueA = queues[0];
      const queueB = queues[1];
      const countA = queueA ? (counts[queueA.id] || 0) : 0;
      const countB = queueB ? (counts[queueB.id] || 0) : 0;
      
      const badgeText = `${countA}|${countB}`;
      chrome.action.setBadgeText({ text: badgeText });
    } else {
      // Total display
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      chrome.action.setBadgeText({ text: total.toString() });
    }
    
    chrome.action.setBadgeBackgroundColor({ color: '#FF6B6B' });
  } catch (error) {
    console.error('❌ Error updating badge:', error);
  }
}

// Storage change listener
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'local') {
    if (changes.isMonitoring) {
      const isMonitoring = changes.isMonitoring.newValue;
      if (isMonitoring) {
        await startMonitoring();
      } else {
        await stopMonitoring();
      }
    }
  }
});

console.log('🎯 ServiceNow Audio Alerts background service worker loaded');

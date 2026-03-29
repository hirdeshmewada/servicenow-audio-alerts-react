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
    console.log('🔍 === POLLING CYCLE START ===');
    console.log('⏰ Polling cycle started at:', new Date().toISOString());
    
    const data = await chrome.storage.local.get(['queues', 'settings', 'previousCounts']);
    const { queues = [], settings = {}, previousCounts = {} } = data;
    
    console.log('📊 Retrieved data:', {
      totalQueues: queues.length,
      enabledQueues: queues.filter(q => q.enabled).length,
      settings: settings,
      previousCounts: previousCounts
    });
    
    if (settings.disablePolling) {
      console.log('⏸️ Polling is disabled - skipping cycle');
      return;
    }
    
    let hasChanges = false;
    const newCounts = {};
    
    // Store last poll time BEFORE polling
    const lastPollAt = new Date().toISOString();
    await chrome.storage.local.set({ lastPollAt });
    console.log('⏰ Last poll time stored:', lastPollAt);
    
    // Poll each queue
    console.log('🔄 Starting to poll each queue...');
    for (let i = 0; i < queues.length; i++) {
      const queue = queues[i];
      console.log(`\n--- Queue ${i + 1}/${queues.length}: ${queue.name} ---`);
      console.log('📋 Queue details:', {
        id: queue.id,
        name: queue.name,
        enabled: queue.enabled,
        hasUrl: !!queue.url,
        url: queue.url ? queue.url.substring(0, 100) + '...' : 'none'
      });
      
      if (!queue.enabled || !queue.url) {
        console.log(`⏭️ Skipping queue ${queue.name} - ${!queue.enabled ? 'disabled' : 'no URL'}`);
        continue;
      }
      
      console.log('🌐 Starting API call for queue:', queue.name);
      const apiStart = Date.now();
      
      try {
        const result = await fetchQueueData(queue.url);
        const apiTime = Date.now() - apiStart;
        
        console.log('✅ API call successful:', {
          queue: queue.name,
          responseTime: `${apiTime}ms`,
          totalRecords: result.quantity,
          hasRecords: result.records.length > 0
        });
        
        const count = result.quantity;
        newCounts[queue.id] = count;
        
        // Update queue count in storage for popup/dashboard
        queue.currentCount = count;
        queue.lastUpdated = lastPollAt;
        queue.records = result.records || []; // Store full records for dashboard
        
        console.log('💾 Queue updated:', {
          name: queue.name,
          currentCount: count,
          recordsStored: result.records.length,
          lastUpdated: lastPollAt
        });
        
        // Check for changes
        const previousCount = previousCounts[queue.id] || 0;
        console.log('📈 Count comparison:', {
          queue: queue.name,
          previous: previousCount,
          current: count,
          change: count - previousCount,
          alertCondition: settings.alertCondition
        });
        
        if (shouldAlert(count, previousCount, settings.alertCondition)) {
          console.log('🚨 Alert condition met - preparing notification for:', queue.name);
          await handleAlert(queue, result, settings);
        } else {
          console.log('🔕 No alert needed for:', queue.name);
        }
        
        // Update badge
        updateBadge(queues, newCounts);
        
      } catch (error) {
        const apiTime = Date.now() - apiStart;
        console.error(`❌ API call failed for ${queue.name}:`, {
          error: error.message,
          responseTime: `${apiTime}ms`,
          queue: queue.name
        });
        
        queue.currentCount = 0;
        queue.lastUpdated = lastPollAt;
        queue.records = []; // Empty records on error
        queue.error = error.message;
      }
    }
    
    console.log('\n💾 Storing polling results...');
    // Save new counts and updated queues
    await chrome.storage.local.set({ 
      previousCounts: newCounts,
      queues: queues,
      lastPollAt: lastPollAt
    });
    
    // Calculate next poll time
    const pollingInterval = settings.pollingInterval || 5; // Default 5 minutes
    const nextPollAt = new Date(Date.now() + (pollingInterval * 60 * 1000)).toISOString();
    await chrome.storage.local.set({ nextPollAt });
    
    console.log('⏰ Next poll scheduled:', {
      interval: `${pollingInterval} minutes`,
      nextPollAt: nextPollAt,
      timeUntilNext: `${pollingInterval}:00`
    });
    
    console.log('✅ === POLLING CYCLE COMPLETE ===');
  } catch (error) {
    console.error('❌ === POLLING CYCLE ERROR ===');
    console.error('💥 Error in polling cycle:', error);
    console.error('🌐 Stack trace:', error.stack);
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
    console.log('\n🚨 === ALERT HANDLING START ===');
    console.log('📋 Alert details:', {
      queueName: queue.name,
      queueId: queue.id,
      ticketCount: result.quantity,
      alertCondition: settings.alertCondition,
      settings: settings
    });
    
    const message = queue.notificationText || `New tickets in ${queue.name}`;
    console.log('💬 Notification message prepared:', message);
    
    // Step 1: Send notification
    console.log('📢 Step 1: Creating browser notification...');
    const notificationStart = Date.now();
    
    if (!settings.disableAlarm) {
      console.log('🔔 Notifications enabled - proceeding with notification');
      
      // Get latest ticket for notification details
      const latestTicket = result.records && result.records.length > 0 ? result.records[0] : null;
      console.log('🎫 Latest ticket for notification:', latestTicket ? {
        number: latestTicket.number,
        description: latestTicket.short_description,
        severity: latestTicket.severity || 'info'
      } : 'No tickets available');
      
      await showNotification(
        latestTicket ? latestTicket.number : 'ServiceNow Alert',
        latestTicket ? latestTicket.short_description : message,
        latestTicket ? latestTicket.severity : 'info',
        null, // custom title
        queue.url // queue URL for click handler
      );
      
      const notificationTime = Date.now() - notificationStart;
      console.log('✅ Notification sent successfully:', {
        queueName: queue.name,
        time: `${notificationTime}ms`,
        ticketNumber: latestTicket?.number || 'N/A'
      });
    } else {
      console.log('🔕 Notifications disabled - skipping notification');
    }
    
    // Step 2: Play audio
    console.log('🎵 Step 2: Playing audio notification...');
    const audioStart = Date.now();
    
    if (!settings.disableAlarm && settings.enableSound !== false) {
      console.log('🔊 Audio enabled - proceeding with audio playback');
      
      await playAudio({
        loop: settings.loopAudio !== false,
        volume: settings.volume || 0.5,
        duration: settings.audioDuration
      });
      
      const audioTime = Date.now() - audioStart;
      console.log('✅ Audio playback started:', {
        queueName: queue.name,
        time: `${audioTime}ms`,
        settings: {
          loop: settings.loopAudio !== false,
          volume: settings.volume || 0.5,
          duration: settings.audioDuration
        }
      });
    } else {
      console.log('� Audio disabled - skipping audio playback');
    }
    
    // Step 3: Update badge
    console.log('🏷️ Step 3: Updating extension badge...');
    const badgeStart = Date.now();
    
    try {
      const data = await chrome.storage.local.get(['queues', 'previousCounts']);
      const { queues: currentQueues, previousCounts } = data;
      const currentCounts = {};
      
      // Build current counts from this poll result
      currentQueues.forEach(q => {
        if (q.id === queue.id) {
          currentCounts[q.id] = result.quantity;
        } else {
          currentCounts[q.id] = previousCounts[q.id] || 0;
        }
      });
      
      updateBadge(currentQueues, currentCounts);
      
      const badgeTime = Date.now() - badgeStart;
      console.log('✅ Badge updated:', {
        queueName: queue.name,
        time: `${badgeTime}ms`,
        totalCount: Object.values(currentCounts).reduce((sum, count) => sum + count, 0)
      });
    } catch (badgeError) {
      console.error('❌ Badge update failed:', badgeError);
    }
    
    console.log('🚨 === ALERT HANDLING COMPLETE ===');
    console.log('📊 Alert summary:', {
      queueName: queue.name,
      ticketCount: result.quantity,
      notificationSent: !settings.disableAlarm,
      audioPlayed: !settings.disableAlarm && settings.enableSound !== false,
      processingTime: `${Date.now() - notificationStart}ms total`
    });
    
  } catch (error) {
    console.error('❌ === ALERT HANDLING ERROR ===');
    console.error('💥 Error handling alert:', error);
    console.error('📋 Queue info:', {
      name: queue.name,
      id: queue.id,
      url: queue.url
    });
    console.error('🌐 Stack trace:', error.stack);
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

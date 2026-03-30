// Notification System Service - Match old extension exactly
// Handles all browser notifications with severity-based icons, queue management, and audio integration

import { playAudio, stopAudio } from './audioManager';

// Notification queue system to prevent flooding
let notificationQueue = [];
let isProcessingNotifications = false;

// Helper function to get priority label - MATCH OLD EXTENSION
function getPriorityLabel(severity) {
  const priorityMap = {
    "1": "CRITICAL",
    "2": "HIGH", 
    "3": "MEDIUM",
    "4": "LOW",
    "5": "PLANNED",
    "10": "SERVICE REQUEST",
    "15": "CHANGE"
  };
  return priorityMap[severity] || "TASK";
}

// Check if current time is within quiet hours
function isQuietHours(startTime, endTime) {
  try {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes > endMinutes) {
      return currentTime >= startMinutes || currentTime <= endMinutes;
    } else {
      return currentTime >= startMinutes && currentTime <= endMinutes;
    }
  } catch (error) {
    console.error('Error checking quiet hours:', error);
    return false;
  }
}

// Create notification with proper delay management - MATCH OLD EXTENSION
async function createNotificationWithDelay(notificationData) {
  const { ticketNumber, ticketDescription, severity, customTitle, queueUrl } = notificationData;
  
  console.log('\n🔔 === NOTIFICATION CREATION PROCESS ===');
  console.log('📋 Processing notification:', { ticketNumber, ticketDescription, severity, customTitle, queueUrl });
  
  // Use custom title if provided, otherwise use ticket number only (not priority)
  const notificationTitle = customTitle || ticketNumber;
  console.log('📝 Notification title:', notificationTitle);
  console.log('📝 Custom title received:', customTitle);
  console.log('📝 Using custom title:', !!customTitle);
  console.log('📝 Using fallback to ticket number:', !customTitle);
  
  // Determine icon based on priority/severity - MATCH OLD EXTENSION
  let iconUrl;
  const priority = parseInt(severity) || 5; // Default to 5 if invalid
  
  switch(priority) {
    case 1:
      iconUrl = chrome.runtime.getURL('icons/Sev1.png');
      break;
    case 2:
      iconUrl = chrome.runtime.getURL('icons/Sev2.png');
      break;
    case 3:
      iconUrl = chrome.runtime.getURL('icons/Sev3.png');
      break;
    default:
      // Fallback to default icon for priorities 4, 5, or invalid
      iconUrl = chrome.runtime.getURL('icons/ITSM128.png');
  }
  
  console.log('🖼️ Icon selected:', {
    priority: priority,
    severity: severity,
    iconUrl: iconUrl.split('/').pop()
  });
  
  const notificationOptions = {
    type: 'basic',
    iconUrl: iconUrl,
    title: notificationTitle,
    message: ticketDescription || 'New ticket alert',
    requireInteraction: true,
    isClickable: true,
    buttons: [{ title: "❌ Close" }]
  };
  
  console.log('⚙️ Notification options prepared:', {
    type: notificationOptions.type,
    title: notificationOptions.title,
    messageLength: notificationOptions.message.length,
    requireInteraction: notificationOptions.requireInteraction,
    isClickable: notificationOptions.isClickable,
    buttons: notificationOptions.buttons.length
  });
  
  const notificationId = `ticket_${ticketNumber}_${Date.now()}`;
  console.log('🆔 Notification ID generated:', notificationId);
  
  const createStart = Date.now();
  
  chrome.notifications.create(notificationId, notificationOptions, function (createdId) {
    const createTime = Date.now() - createStart;
    
    if (chrome.runtime.lastError) {
      console.error('❌ Notification creation error:', chrome.runtime.lastError);
      console.log('🔄 Attempting fallback notification...');
      
      // Fallback notification without icon
      const fallbackOptions = {
        type: 'basic',
        title: notificationTitle,
        message: ticketDescription || 'New ticket alert',
        requireInteraction: false,
        isClickable: true,
        buttons: [{ title: "❌ Close" }]
      };
      
      chrome.notifications.create(`fallback_${notificationId}`, fallbackOptions, function (fallbackId) {
        const fallbackTime = Date.now() - createStart;
        if (!chrome.runtime.lastError) {
          console.log('✅ Fallback notification created:', {
            fallbackId: fallbackId,
            time: `${fallbackTime}ms`,
            hasQueueUrl: !!queueUrl
          });
          
          if (queueUrl) {
            chrome.storage.local.set({ [`notification_${fallbackId}`]: queueUrl });
            console.log('💾 Queue URL stored for fallback notification');
          }
        } else {
          console.error('❌ Fallback notification also failed:', chrome.runtime.lastError);
        }
      });
    } else {
      console.log('✅ Primary notification created successfully:', {
        createdId: createdId,
        time: `${createTime}ms`,
        hasQueueUrl: !!queueUrl
      });
      
      if (queueUrl) {
        chrome.storage.local.set({ [`notification_${createdId}`]: queueUrl });
        console.log('💾 Queue URL stored for notification:', queueUrl.substring(0, 100) + '...');
      }
    }
  });
  
  // Auto-clear after 8 seconds - MATCH OLD EXTENSION
  console.log('⏰ Scheduling auto-clear in 8 seconds...');
  setTimeout(() => {
    chrome.notifications.clear(notificationId, (wasCleared) => {
      if (wasCleared) {
        console.log('🧹 Notification auto-cleared:', notificationId);
        chrome.storage.local.remove(`notification_${notificationId}`);
      } else {
        console.log('ℹ️ Notification already cleared or not found:', notificationId);
      }
    });
  }, 8000);
  
  console.log('🔔 === NOTIFICATION CREATION COMPLETE ===');
}

// Process notifications one by one - MATCH OLD EXTENSION
async function processNotificationQueue() {
  if (isProcessingNotifications || notificationQueue.length === 0) return;
  
  isProcessingNotifications = true;
  while (notificationQueue.length > 0) {
    const notification = notificationQueue.shift();
    await createNotificationWithDelay(notification);
    // Wait 2 seconds between notifications to prevent flooding
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  isProcessingNotifications = false;
}

// Main notification function with ticket info and severity - MATCH OLD EXTENSION
export function showNotification(ticketNumber, ticketDescription, severity, customTitle = null, queueUrl = null) {
  console.log('\n📢 === NOTIFICATION CREATION START ===');
  console.log('📋 Notification details:', {
    ticketNumber: ticketNumber,
    ticketDescription: ticketDescription,
    severity: severity,
    customTitle: customTitle,
    queueUrl: queueUrl ? queueUrl.substring(0, 100) + '...' : 'none'
  });
  
  // Use custom title if provided, otherwise use ticket number only (not priority)
  const notificationTitle = customTitle || ticketNumber;
  console.log('📝 Final notification title:', notificationTitle);
  console.log('📝 Custom title provided:', !!customTitle);
  console.log('📝 Fallback to ticket number:', !customTitle);
  
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    const { quietHours = false, quietStart = '22:00', quietEnd = '08:00', enableNotifications = true } = settings;
    
    console.log('⚙️ Notification settings:', {
      quietHours: quietHours,
      quietStart: quietStart,
      quietEnd: quietEnd,
      enableNotifications: enableNotifications
    });
    
    if (!enableNotifications) {
      console.log('🔕 Notifications disabled in settings - skipping notification');
      return;
    }
    
    if (quietHours && isQuietHours(quietStart, quietEnd)) {
      console.log('🌙 Quiet hours active - notification suppressed');
      return;
    }
    
    console.log('✅ Notification approved - adding to queue');
    notificationQueue.push({ ticketNumber, ticketDescription, severity, customTitle, queueUrl });
    
    console.log('📝 Current notification queue:', {
      queueLength: notificationQueue.length,
      isProcessing: isProcessingNotifications,
      pendingNotifications: notificationQueue.length
    });
    
    processNotificationQueue();
  });
}

// Notification button click handler - handles Close button - MATCH OLD EXTENSION
export function setupNotificationButtonHandler() {
  chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    console.log('Notification button clicked:', notificationId, 'Button index:', buttonIndex);
    
    try {
      if (buttonIndex === 0) {
        // Close button clicked
        console.log('Close button clicked - stopping audio and dismissing notification');
        await chrome.runtime.sendMessage({ type: "STOP_AUDIO" });
        console.log('Audio stopped via Close button');
        
        // Clear the notification after stopping audio
        chrome.notifications.clear(notificationId);
        chrome.storage.local.remove(`notification_${notificationId}`);
        console.log('Notification dismissed via Close button');
      }
    } catch (error) {
      console.error('Error handling notification button click:', error);
    }
  });
}

// Notification click handler - opens the specific queue URL and stops audio - MATCH OLD EXTENSION
export function setupNotificationClickHandler() {
  chrome.notifications.onClicked.addListener(async (notificationId) => {
    console.log('Notification body clicked:', notificationId);
    
    try {
      // Stop audio when opening queue
      await chrome.runtime.sendMessage({ type: "STOP_AUDIO" });
      console.log('Audio stopped when opening queue');
      
      // Get the stored queue URL for this notification
      const result = await chrome.storage.local.get([`notification_${notificationId}`]);
      const queueUrl = result[`notification_${notificationId}`];
      
      if (queueUrl) {
        console.log('Opening queue URL:', queueUrl);
        // Create new tab with the queue URL
        await chrome.tabs.create({ url: queueUrl });
        
        // Clear the notification after clicking
        chrome.notifications.clear(notificationId);
        chrome.storage.local.remove(`notification_${notificationId}`);
      } else {
        console.log('No queue URL found for notification:', notificationId);
        // Fallback to root URL if available
        const rootResult = await chrome.storage.sync.get(['rooturl']);
        if (rootResult.rooturl) {
          await chrome.tabs.create({ url: rootResult.rooturl });
        }
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  });
}

// Notification close handler - stops audio when user manually closes notification - MATCH OLD EXTENSION
export function setupNotificationCloseHandler() {
  chrome.notifications.onClosed.addListener(async (notificationId) => {
    console.log('Notification closed:', notificationId);
    
    try {
      // Stop any playing audio when user manually closes
      console.log('Notification closed by user or auto-clear - stopping audio');
      await chrome.runtime.sendMessage({ type: "STOP_AUDIO" });
      console.log('Audio stopped due to notification close');
      
      // Always clean up stored URL
      chrome.storage.local.remove(`notification_${notificationId}`);
    } catch (error) {
      console.error('Error handling notification close:', error);
    }
  });
}

// Setup all notification handlers - MATCH OLD EXTENSION
export async function setupNotificationHandlers() {
  try {
    setupNotificationButtonHandler();
    setupNotificationClickHandler();
    setupNotificationCloseHandler();
    console.log('Notification handlers set up');
  } catch (error) {
    console.error('Error setting up notification handlers:', error);
  }
}

export async function requestNotificationPermission() {
  try {
    const granted = await chrome.permissions.request({
      permissions: ['notifications']
    });
    
    console.log('Notification permission:', granted ? 'granted' : 'denied');
    return granted;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

// Export for testing purposes
export function getNotificationQueue() {
  return [...notificationQueue];
}

export function clearNotificationQueue() {
  notificationQueue = [];
}

export async function checkNotificationPermission() {
  try {
    const hasPermission = await chrome.permissions.contains({
      permissions: ['notifications']
    });
    
    console.log('Notification permission status:', hasPermission);
    return hasPermission;
  } catch (error) {
    console.error('❌ Error checking notification permission:', error);
    return false;
  }
}

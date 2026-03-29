// Notification System Service - Updated to match original functionality
// Handles all browser notifications with severity-based icons, queue management, and audio integration

import { stopAudio } from './audioManager';

// Notification queue system to prevent flooding
let notificationQueue = [];
let isProcessingNotifications = false;

// Helper function to get priority label
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

// Create notification with proper delay management
async function createNotificationWithDelay(notificationData) {
  const { ticketNumber, ticketDescription, severity, customTitle, queueUrl } = notificationData;

  console.log('Creating notification:', { ticketNumber, ticketDescription, severity, customTitle, queueUrl });

  // Use custom title if provided, otherwise use default
  const notificationTitle = customTitle || `${getPriorityLabel(parseInt(severity) || 5)} | ${ticketNumber}`;

  // Determine icon based on priority/severity
  let iconUrl;
  const priority = parseInt(severity) || 5;

  switch (priority) {
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
      iconUrl = chrome.runtime.getURL('icons/ITSM128.png');
  }

  const notificationOptions = {
    type: 'basic',
    iconUrl: iconUrl,
    title: notificationTitle,
    message: ticketDescription || 'New ticket alert',
    requireInteraction: true,
    isClickable: true,
    buttons: [{ title: "Close" }]
  };

  console.log('Notification options:', notificationOptions);

  const notificationId = `ticket_${ticketNumber}_${Date.now()}`;

  chrome.notifications.create(notificationId, notificationOptions, function (createdId) {
    if (chrome.runtime.lastError) {
      console.error('Notification creation error:', chrome.runtime.lastError);
      const fallbackOptions = {
        type: 'basic',
        title: notificationTitle,
        message: ticketDescription || 'New ticket alert',
        requireInteraction: false,
        isClickable: true,
        buttons: [{ title: "Close" }]
      };
      chrome.notifications.create(`fallback_${notificationId}`, fallbackOptions, function (fallbackId) {
        if (!chrome.runtime.lastError && queueUrl) {
          chrome.storage.local.set({ [`notification_${fallbackId}`]: queueUrl });
        }
      });
    } else if (queueUrl) {
      chrome.storage.local.set({ [`notification_${createdId}`]: queueUrl });
    }
  });

  // Auto-clear after 8 seconds
  setTimeout(() => {
    chrome.notifications.clear(notificationId, (wasCleared) => {
      if (wasCleared) {
        chrome.storage.local.remove(`notification_${notificationId}`);
      }
    });
  }, 8000);
}

// Process notifications one by one
async function processNotificationQueue() {
  if (isProcessingNotifications || notificationQueue.length === 0) return;

  isProcessingNotifications = true;
  while (notificationQueue.length > 0) {
    const notification = notificationQueue.shift();
    await createNotificationWithDelay(notification);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  isProcessingNotifications = false;
}

// Main notification function with ticket info and severity
export function showNotification(ticketNumber, ticketDescription, severity, customTitle = null, queueUrl = null) {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    const { quietHours = false, quietStart = '22:00', quietEnd = '08:00', enableNotifications = true } = settings;

    if (!enableNotifications) {
      console.log('Notifications disabled in settings');
      return;
    }

    if (quietHours && isQuietHours(quietStart, quietEnd)) {
      console.log('Quiet hours - notification suppressed');
      return;
    }

    notificationQueue.push({ ticketNumber, ticketDescription, severity, customTitle, queueUrl });
    processNotificationQueue();
  });
}

// Simple notification for basic usage
export async function showBasicNotification(title, message, type = 'info') {
  try {
    // Check if notifications are permitted
    const hasPermission = await chrome.permissions.contains({
      permissions: ['notifications']
    });

    if (!hasPermission) {
      console.warn('⚠️ Notification permission not granted');
      return false;
    }

    // Get settings to check quiet hours and desktop notifications
    const settings = await chrome.storage.local.get(['settings']);
    const { quietHours = false, quietStart = '22:00', quietEnd = '08:00', enableDesktop = true } = settings.settings || {};

    // Check quiet hours
    if (quietHours && isQuietHours(quietStart, quietEnd)) {
      console.log('🔕 Quiet hours - notification suppressed');
      return false;
    }

    // Check if desktop notifications are enabled
    if (!enableDesktop) {
      console.log('🔕 Desktop notifications disabled');
      return false;
    }

    // Create notification
    const notificationId = await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/ITSM48.png'),
      title: title,
      message: message,
      priority: type === 'urgent' ? 2 : 0,
      isClickable: true
    });

    console.log('Notification sent:', { title, message, type, notificationId });
    return notificationId;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    return false;
  }
}

export async function clearNotification(notificationId) {
  try {
    if (notificationId) {
      await chrome.notifications.clear(notificationId);
    } else {
      await chrome.notifications.clearAll();
    }
    console.log('Notification cleared');
  } catch (error) {
    console.error('Error clearing notification:', error);
  }
}

// Notification button click handler - handles Close button
export function setupNotificationButtonHandler() {
  chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    console.log('Notification button clicked:', notificationId, 'Button index:', buttonIndex);

    try {
      if (buttonIndex === 0) {
        // Close button clicked
        console.log('Close button clicked - stopping audio and dismissing notification');
        await stopAudio();
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

// Notification click handler - opens the specific queue URL and stops audio
export function setupNotificationClickHandler() {
  chrome.notifications.onClicked.addListener(async (notificationId) => {
    console.log('Notification body clicked:', notificationId);

    try {
      // Stop audio when opening queue
      await stopAudio();
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
        // Fallback to options page
        await chrome.tabs.create({
          url: chrome.runtime.getURL('options.html')
        });
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  });
}

// Notification close handler - stops audio when user manually closes notification
export function setupNotificationCloseHandler() {
  chrome.notifications.onClosed.addListener(async (notificationId) => {
    console.log('Notification closed:', notificationId);

    try {
      // Stop any playing audio when user manually closes
      console.log('Notification closed by user or auto-clear - stopping audio');
      await stopAudio();
      console.log('Audio stopped due to notification close');

      // Always clean up stored URL
      chrome.storage.local.remove(`notification_${notificationId}`);
    } catch (error) {
      console.error('Error handling notification close:', error);
    }
  });
}

// Setup all notification handlers
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

// Notification System Service - Migrated from original notification-system.js

export async function showNotification(title, message, type = 'info') {
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
      iconUrl: '/icons/ITSM48.png',
      title: title,
      message: message,
      priority: type === 'urgent' ? 2 : 0,
      isClickable: true
    });

    console.log('🔔 Notification sent:', { title, message, type, notificationId });
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
    console.log('🔕 Notification cleared');
  } catch (error) {
    console.error('❌ Error clearing notification:', error);
  }
}

export async function setupNotificationHandlers() {
  try {
    // Handle notification clicks
    chrome.notifications.onClicked.addListener((notificationId) => {
      console.log('🖱️ Notification clicked:', notificationId);
      // Open options page when notification is clicked
      chrome.tabs.create({
        url: chrome.runtime.getURL('options.html')
      });
    });

    // Handle notification button clicks (if we add buttons later)
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      console.log('🖱️ Notification button clicked:', notificationId, buttonIndex);
    });

    console.log('🔔 Notification handlers set up');
  } catch (error) {
    console.error('❌ Error setting up notification handlers:', error);
  }
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
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startMinutes > endMinutes) {
      return currentTime >= startMinutes || currentTime <= endMinutes;
    } else {
      return currentTime >= startMinutes && currentTime <= endMinutes;
    }
  } catch (error) {
    console.error('❌ Error checking quiet hours:', error);
    return false;
  }
}

export async function requestNotificationPermission() {
  try {
    const granted = await chrome.permissions.request({
      permissions: ['notifications']
    });
    
    console.log('📋 Notification permission:', granted ? 'granted' : 'denied');
    return granted;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
}

export async function checkNotificationPermission() {
  try {
    const hasPermission = await chrome.permissions.contains({
      permissions: ['notifications']
    });
    
    console.log('📋 Notification permission status:', hasPermission);
    return hasPermission;
  } catch (error) {
    console.error('❌ Error checking notification permission:', error);
    return false;
  }
}

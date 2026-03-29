import { useCallback } from 'react';
import webext from 'webextension-polyfill';

export const useNotifications = () => {
  const showNotification = useCallback(async (title, message, type = 'info') => {
    try {
      // Check if notifications are permitted
      const hasPermission = await webext.permissions.contains({
        permissions: ['notifications']
      });

      if (!hasPermission) {
        console.warn('Notification permission not granted');
        return;
      }

      // Create notification
      await webext.notifications.create({
        type: 'basic',
        iconUrl: '/icons/ITSM48.png',
        title: title,
        message: message,
        priority: type === 'urgent' ? 2 : 0
      });

      console.log('🔔 Notification sent:', { title, message, type });
    } catch (error) {
      console.error('❌ Error sending notification:', error);
    }
  }, []);

  const clearNotifications = useCallback(async () => {
    try {
      await webext.notifications.clearAll();
      console.log('🔕 All notifications cleared');
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    try {
      const granted = await webext.permissions.request({
        permissions: ['notifications']
      });
      
      console.log('📋 Notification permission:', granted ? 'granted' : 'denied');
      return granted;
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }, []);

  return {
    showNotification,
    clearNotifications,
    requestNotificationPermission
  };
};

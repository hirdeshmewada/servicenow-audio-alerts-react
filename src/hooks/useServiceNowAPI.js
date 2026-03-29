import { useState, useCallback } from 'react';

export const useServiceNowAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchQueueData = useCallback(async (url) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching data from:', url);
      
      const response = await fetch(url + '&sysparm_limit=1000', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const records = data.records || [];
      
      console.log('📊 API Response:', {
        url: url,
        quantity: records.length,
        records: records
      });

      return {
        quantity: records.length,
        records: records,
        timestamp: Date.now()
      };

    } catch (err) {
      console.error('❌ API Error:', err);
      setError(err.message);
      return {
        quantity: 0,
        records: [],
        timestamp: Date.now()
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    fetchQueueData,
    loading,
    error
  };
};

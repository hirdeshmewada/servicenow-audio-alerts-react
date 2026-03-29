// Migrated from js/modules/servicenow-api.js

export const fetchQueueData = async (url) => {
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
    return {
      quantity: 0,
      records: [],
      timestamp: Date.now()
    };
  }
};

export const processRecords = (records) => {
  if (!records || records.length === 0) {
    return createEmptyResult();
  }

  const result = {
    quantity: records.length,
    number: records[0]?.number || null,
    severity: records[0]?.severity || null,
    description: records[0]?.short_description || null,
    timestamp: Date.now(),
    account: records[0]?.caller_id || null,
    assigned_to: records[0]?.assigned_to || null,
    state: records[0]?.state || null,
    u_next_step_date_and_time: records[0]?.u_next_step_date_and_time || null,
    impact: records[0]?.impact || null,
    category: records[0]?.category || null,
    opened_by: records[0]?.opened_by || null
  };

  return result;
};

export const createEmptyResult = () => {
  return {
    quantity: 0,
    number: null,
    severity: null,
    description: null,
    timestamp: 0,
    account: null,
    assigned_to: null,
    state: null,
    u_next_step_date_and_time: null,
    impact: null,
    category: null,
    opened_by: null
  };
};

export const validateServiceNowURL = (url) => {
  if (!url || url.trim() === '') {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    
    if (!['https:', 'http:'].includes(urlObj.protocol)) {
      return false;
    }
    
    const hostname = urlObj.hostname.toLowerCase();
    if (!hostname.includes('service-now.com') && !hostname.includes('.service-now.com')) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('URL validation error:', error);
    return false;
  }
};

export const convertToRESTURL = (url) => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Check if it's already a REST API URL
    if (pathname.includes('/api/now/table/')) {
      return url;
    }
    
    // Convert from list view to REST API
    if (pathname.includes('/nav_to.do')) {
      const params = new URLSearchParams(urlObj.search);
      const sysparmQuery = params.get('sysparm_query');
      const tableName = params.get('sysparm_table') || 'incident';
      
      if (sysparmQuery) {
        return `${urlObj.origin}/api/now/table/${tableName}?${sysparmQuery}`;
      }
    }
    
    // Default conversion for ServiceNow URLs
    if (pathname.includes('/')) {
      const parts = pathname.split('/').filter(part => part);
      if (parts.length > 0) {
        const tableName = parts[parts.length - 1];
        return `${urlObj.origin}/api/now/table/${tableName}`;
      }
    }
    
    return url;
  } catch (error) {
    console.error('URL conversion error:', error);
    return url;
  }
};

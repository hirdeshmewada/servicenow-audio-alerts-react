// Migrated from js/modules/servicenow-api.js

// Progressive decoding for multiple encoding levels
const progressiveDecode = (encodedString) => {
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
};

// Convert ServiceNow UI URL to REST API URL
export const convertToRESTURL = (url) => {
  if (!url || url === '') return null;

  try {
    console.log('=== ENHANCED SERVICENOW URL PROCESSING ===');
    console.log('Input URL:', url);
    
    // Handle new ServiceNow UI URLs with multiple encoding
    let processedUrl = url;
    if (url.includes('/now/nav/ui/classic/params/target/')) {
      console.log('Detected new ServiceNow UI URL, processing...');
      
      const targetMatch = url.match(/params\/target\/(.+)$/);
      if (targetMatch) {
        let targetUrl = targetMatch[1];
        let decodedUrl = progressiveDecode(targetUrl);
        console.log('Progressively decoded URL:', decodedUrl);
        
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
      return null;
    }

    // Extract table name from URL
    let tableName = '';
    const listMatch = urlObj.pathname.match(/\/(.+?)_list\.do/);
    const tableMatch = urlObj.pathname.match(/\/api\/now\/table\/(.+)/);
    
    if (listMatch) {
      tableName = listMatch[1];
    } else if (tableMatch) {
      // Already a REST URL, return as-is with parameters
      return processedUrl + (processedUrl.includes('?') ? '&' : '?') + 'sysparm_limit=1000';
    }
    
    if (!tableName) {
      console.error('Could not extract table name from URL');
      return null;
    }
    
    // Extract query parameters
    const searchParams = new URLSearchParams(urlObj.search);
    let sysparmQuery = searchParams.get('sysparm_query') || '';
    
    // Build REST API URL
    let restURL = `${urlObj.protocol}//${urlObj.host}/api/now/table/${tableName}`;
    
    if (sysparmQuery) {
      restURL += '?sysparm_query=' + encodeURIComponent(sysparmQuery);
    }
    
    // Add REST API parameters and fields
    const separator = sysparmQuery ? '&' : '?';
    restURL += `${separator}JSONv2&sysparm_limit=1000&sysparm_fields=number,severity,short_description,priority,sys_id,sys_updated_on,account,assigned_to,state,impact,assignment_group,u_first_assignment_group,u_service_downtime_started,u_service_downtime_end,u_resolved,u_resolved_by`;
    
    console.log('Final REST API URL:', restURL);
    return restURL;
    
  } catch (error) {
    console.error('Error converting URL to REST API:', error);
    return null;
  }
};

export const fetchQueueData = async (url) => {
  try {
    console.log('🔍 Fetching data from:', url);
    
    // Convert UI URL to REST API URL
    const restURL = convertToRESTURL(url);
    if (!restURL) {
      throw new Error('Failed to convert URL to REST API format');
    }
    
    console.log('🔄 Using REST API URL:', restURL);
    
    const response = await fetch(restURL, {
      method: 'GET',
      credentials: 'include', // Send cookies for ServiceNow authentication
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
      url: restURL,
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

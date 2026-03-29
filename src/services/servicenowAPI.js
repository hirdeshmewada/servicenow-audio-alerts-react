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

// Convert ServiceNow UI URL to REST API URL - Match old extension exactly
export const convertToRESTURL = (url) => {
  if (!url || url === '') return null;

  try {
    console.log('🔗 === MATCHING OLD EXTENSION URL PROCESSING ===');
    console.log('📥 Input URL:', url);
    
    // Handle new ServiceNow UI URLs with multiple encoding
    let processedUrl = url;
    if (url.includes('/now/nav/ui/classic/params/target/')) {
      console.log('✅ Detected new ServiceNow UI URL, processing...');
      
      const targetMatch = url.match(/params\/target\/(.+)$/);
      if (targetMatch) {
        let targetUrl = targetMatch[1];
        
        // Progressive decoding - handle multiple encoding levels
        let decodedUrl = progressiveDecode(targetUrl);
        console.log('🔓 Progressively decoded URL:', decodedUrl);
        
        // Rebuild full URL
        const urlMatch = url.match(/(https:\/\/[^\/]+)/);
        if (urlMatch) {
          processedUrl = urlMatch[1] + '/' + decodedUrl;
          console.log('🔗 Rebuilt URL:', processedUrl);
        }
      }
    } else {
      console.log('ℹ️ Using original URL format (no conversion needed)');
    }
    
    // Validate it's a ServiceNow URL
    const urlObj = new URL(processedUrl);
    if (!urlObj.hostname.includes('service-now.com')) {
      console.warn('⚠️ URL does not appear to be a ServiceNow instance:', processedUrl);
      return null;
    }

    // Extract ServiceNow query parameters safely
    const serviceNowQuery = extractServiceNowQuery(processedUrl);
    console.log('🔍 Extracted ServiceNow query:', serviceNowQuery);
    
    // Build REST API URL with proper encoding - MATCH OLD EXTENSION EXACTLY
    let restURL = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    
    // Add ServiceNow query with proper encoding to preserve & characters
    if (serviceNowQuery) {
      // Use encodeURIComponent to properly encode the entire query
      // This preserves internal & characters while making it URL-safe
      restURL += '?sysparm_query=' + encodeURIComponent(serviceNowQuery);
    }
    
    // Add REST API parameters - MATCH OLD EXTENSION EXACTLY
    const separator = serviceNowQuery ? '&' : '?';
    restURL += `${separator}JSONv2&sysparm_fields=number,severity,short_description,priority,sys_id,sys_updated_on,account,assigned_to,state,u_next_step_date_and_time,impact,category,opened_by,assignment_group,u_first_assignment_group,u_service_downtime_started,u_service_downtime_end,u_fault_cause,resolved_by,resolved_at,u_resolved,u_resolved_by,sys_mod_count`;
    
    console.log('🎯 Final REST API URL (matching old extension):', restURL);
    console.log('📏 Query length:', serviceNowQuery.length, 'characters');
    console.log('✅ === URL PROCESSING COMPLETE ===');
    
    return restURL;
    
  } catch (error) {
    console.error('❌ === URL PROCESSING ERROR ===');
    console.error('💥 Error Type:', error.constructor.name);
    console.error('📝 Error Message:', error.message);
    console.error('🔗 Input URL:', url);
    console.error('🌐 Stack Trace:', error.stack);
    return null;
  }
};

// Extract ServiceNow query from URL - Helper function
function extractServiceNowQuery(url) {
  try {
    // Handle both encoded and non-encoded URLs
    let workingUrl = url;
    
    // Decode URL first if it's encoded
    if (url.includes('%')) {
      workingUrl = progressiveDecode(url);
    }
    
    // Extract sysparm_query using multiple patterns
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
    
    return '';
  } catch (error) {
    console.error('Error extracting ServiceNow query:', error);
    return '';
  }
}

// ServiceNow API Service - Match original extension exactly
// Original approach: ServiceNow returns JSON when accessed from Chrome extension context

export const fetchQueueData = async (url) => {
  try {
    console.log('🔍 === MATCHING OLD EXTENSION FETCH ===');
    console.log('📥 Input URL:', url);
    
    // Convert URL using the same logic as old extension
    const restURL = convertToRESTURL(url);
    if (!restURL) {
      console.error('❌ URL conversion failed - cannot proceed');
      throw new Error('Failed to convert URL to REST API format');
    }
    
    console.log('� Using REST API URL:', restURL);
    
    console.log('📤 Sending fetch request...');
    const fetchStart = Date.now();
    
    const response = await fetch(restURL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const fetchTime = Date.now() - fetchStart;
    console.log(`⏱️ Fetch completed in ${fetchTime}ms`);
    console.log('📊 Response status:', response.status, response.statusText);

    if (!response.ok) {
      console.error('❌ HTTP Error:', {
        status: response.status,
        statusText: response.statusText,
        url: restURL
      });
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('📦 Parsing JSON response...');
    const data = await response.json();
    const records = data.records || [];
    
    console.log('📈 Response Summary:', {
      url: restURL,
      totalRecords: records.length,
      hasRecords: records.length > 0,
      responseTime: `${fetchTime}ms`,
      dataType: typeof data
    });

    if (records.length > 0) {
      console.log('🎫 Sample record:', records[0]);
      console.log('🏷️ Ticket numbers:', records.map(r => r.number).slice(0, 5));
    }

    console.log('✅ === FETCH SUCCESS ===');

    return {
      quantity: records.length,
      records: records,
      timestamp: Date.now()
    };

  } catch (err) {
    console.error('❌ === FETCH ERROR ===');
    console.error('💥 Error:', err.message);
    console.error('🔗 URL:', url);
    console.error('🌐 Stack:', err.stack);
    
    // If JSON parsing failed, log the response text
    if (err.message.includes('JSON')) {
      console.error('📄 ServiceNow returned HTML instead of JSON - URL may need different format');
    }
    
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

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
    console.log('🔗 === URL CONVERSION DEBUG START ===');
    console.log('📥 Original URL:', url);
    console.log('🔍 URL length:', url.length, 'characters');
    
    // Handle new ServiceNow UI URLs with multiple encoding
    let processedUrl = url;
    if (url.includes('/now/nav/ui/classic/params/target/')) {
      console.log('✅ Detected new ServiceNow UI URL format');
      
      const targetMatch = url.match(/params\/target\/(.+)$/);
      if (targetMatch) {
        let targetUrl = targetMatch[1];
        console.log('🎯 Extracted target URL:', targetUrl);
        
        let decodedUrl = progressiveDecode(targetUrl);
        console.log('🔓 Progressively decoded URL:', decodedUrl);
        console.log('🔓 Decode iterations completed');
        
        const urlMatch = url.match(/(https:\/\/[^\/]+)/);
        if (urlMatch) {
          processedUrl = urlMatch[1] + '/' + decodedUrl;
          console.log('🔗 Rebuilt full URL:', processedUrl);
        }
      } else {
        console.error('❌ Could not extract target URL from params');
      }
    } else {
      console.log('ℹ️ Using original URL format (no conversion needed)');
    }
    
    // Validate it's a ServiceNow URL
    const urlObj = new URL(processedUrl);
    console.log('🌐 Parsed URL:', {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      search: urlObj.search
    });
    
    if (!urlObj.hostname.includes('service-now.com')) {
      console.warn('⚠️ URL does not appear to be a ServiceNow instance:', processedUrl);
      return null;
    }

    // Extract table name from URL
    let tableName = '';
    const listMatch = urlObj.pathname.match(/\/(.+?)_list\.do/);
    const tableMatch = urlObj.pathname.match(/\/api\/now\/table\/(.+)/);
    
    console.log('🏷️ Table extraction attempts:', {
      listMatch: listMatch ? listMatch[1] : 'none',
      tableMatch: tableMatch ? tableMatch[1] : 'none'
    });
    
    if (listMatch) {
      tableName = listMatch[1];
      console.log('✅ Table name extracted from list format:', tableName);
    } else if (tableMatch) {
      // Already a REST URL, return as-is with parameters
      console.log('ℹ️ Already REST API URL - returning with parameters');
      return processedUrl + (processedUrl.includes('?') ? '&' : '?') + 'sysparm_limit=1000';
    }
    
    if (!tableName) {
      console.error('❌ Could not extract table name from URL pathname:', urlObj.pathname);
      return null;
    }
    
    // Extract query parameters
    const searchParams = new URLSearchParams(urlObj.search);
    let sysparmQuery = searchParams.get('sysparm_query') || '';
    console.log('🔍 Query extraction:', {
      originalSearch: urlObj.search,
      extractedQuery: sysparmQuery,
      queryLength: sysparmQuery.length
    });
    
    // Build REST API URL using original approach
    let restURL = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    console.log('🔗 Base REST URL:', restURL);
    
    // Add ServiceNow query with proper encoding
    if (sysparmQuery) {
      const encodedQuery = encodeURIComponent(sysparmQuery);
      restURL += '?sysparm_query=' + encodedQuery;
      console.log('🔐 Query encoded:', {
        original: sysparmQuery,
        encoded: encodedQuery,
        encodedLength: encodedQuery.length
      });
    }
    
    // Add REST API parameters
    const separator = sysparmQuery ? '&' : '?';
    const restParams = `${separator}JSONv2&sysparm_limit=1000&sysparm_fields=number,severity,short_description,priority,sys_id,sys_updated_on,account,assigned_to,state,impact,assignment_group,u_first_assignment_group,u_service_downtime_started,u_service_downtime_end,u_resolved,u_resolved_by`;
    restURL += restParams;
    
    console.log('📋 Added REST parameters:', restParams);
    console.log('🎯 Final REST API URL:', restURL);
    console.log('📏 Final URL length:', restURL.length, 'characters');
    console.log('✅ === URL CONVERSION DEBUG END === SUCCESS ===');
    
    return restURL;
    
  } catch (error) {
    console.error('❌ === URL CONVERSION DEBUG END === ERROR ===');
    console.error('💥 Error Type:', error.constructor.name);
    console.error('📝 Error Message:', error.message);
    console.error('🔗 Input URL:', url);
    console.error('🌐 Stack Trace:', error.stack);
    return null;
  }
};

// ServiceNow API Service - Match original extension exactly
// Original approach: ServiceNow returns JSON when accessed from Chrome extension context

export const fetchQueueData = async (url) => {
  try {
    console.log('🔍 === ORIGINAL EXTENSION APPROACH ===');
    console.log('📥 Input URL:', url);
    
    // Exact original approach: just add sysparm_limit to original URL
    // ServiceNow automatically returns JSON when accessed from Chrome extension
    const finalUrl = url + '&sysparm_limit=1000';
    console.log('🔄 Using original URL with limit:', finalUrl);
    
    console.log('📤 Sending fetch request...');
    const fetchStart = Date.now();
    
    const response = await fetch(finalUrl, {
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
        url: finalUrl
      });
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('📦 Parsing JSON response...');
    const data = await response.json();
    const records = data.records || [];
    
    console.log('📈 Response Summary:', {
      url: finalUrl,
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

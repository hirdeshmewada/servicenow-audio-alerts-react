// Enhanced Initial Acknowledgement Service with FLT Insights Diagnostic Parsing
// Supports Nokia/HPE, Drivenets, Juniper, and Static routing

const SYS_ID_PATTERN = /^[a-f0-9]{32}$/i;

// Helper functions
const field = (record, name) => {
  if (!record) return '';
  const value = record[name];
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') {
    const display = value.display_value !== undefined ? value.display_value : value.value;
    return display === undefined || display === null ? '' : String(display).trim();
  }
  return String(value).trim();
};

const sysIdField = (record, name) => {
  if (!record) return '';
  const value = record[name];
  if (!value) return '';
  if (typeof value === 'object' && value.value && SYS_ID_PATTERN.test(value.value)) {
    return value.value;
  }
  if (typeof value === 'string' && SYS_ID_PATTERN.test(value)) return value;
  return '';
};

const firstFilled = (record, names) => {
  for (let i = 0; i < names.length; i++) {
    const value = field(record, names[i]);
    if (value && value.toLowerCase() !== 'undefined') return value;
  }
  return '';
};

const toYesNo = (value) => {
  if (!value) return '';
  const lower = String(value).trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'managed'].indexOf(lower) !== -1) return 'YES';
  if (['false', 'no', 'n', '0', 'unmanaged', 'not managed'].indexOf(lower) !== -1) return 'NO';
  if (lower === 'yes') return 'YES';
  if (lower === 'no') return 'NO';
  return String(value).trim();
};

const circuitType = (record) => {
  const direct = firstFilled(record, [
    'u_circuit_type',
    'u_redundancy',
    'u_redundancy_type',
    'u_link_type',
    'u_link_role',
    'u_ha_type',
    'u_primary_secondary',
    'u_path'
  ]);
  if (!direct) return '';
  const lower = direct.toLowerCase();
  if (lower.indexOf('primary') !== -1) return 'Primary';
  if (lower.indexOf('secondary') !== -1) return 'Secondary';
  if (lower.indexOf('single') !== -1) return 'Single';
  return direct;
};

const parseSysIdFromUrl = (url) => {
  if (!url) return '';
  let decoded = url;
  try { decoded = decodeURIComponent(url); } catch (e) {}
  const patterns = [
    /sn_customerservice_case\/([a-f0-9]{32})/i,
    /[?&]sys_id=([a-f0-9]{32})/i,
    /sysparm_sys_id=([a-f0-9]{32})/i
  ];
  for (let i = 0; i < patterns.length; i++) {
    const match = decoded.match(patterns[i]);
    if (match) return match[1];
  }
  return '';
};

const readPageContext = () => {
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get('sys_id') || params.get('sysparm_sys_id');
  if (fromQuery && /^[a-f0-9]{32}$/i.test(fromQuery)) {
    return { origin: location.origin, sysId: fromQuery };
  }
  const href = location.href;
  const nextUi = href.match(/sn_customerservice_case\/([a-f0-9]{32})/i);
  if (nextUi) return { origin: location.origin, sysId: nextUi[1] };
  const unique = document.getElementById('sys_uniqueValue');
  const table = document.getElementById('sys_target');
  if (unique && /^[a-f0-9]{32}$/i.test(unique.value) &&
      (!table || !table.value || table.value === 'sn_customerservice_case')) {
    return { origin: location.origin, sysId: unique.value };
  }
  return null;
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  });
  if (!response.ok) {
    throw new Error('HTTP ' + response.status + ' for ' + url);
  }
  return response.json();
};

const fetchTableRecord = async (origin, table, sysId) => {
  try {
    const url = origin + '/api/now/table/' + table + '/' + sysId + '?sysparm_display_value=all';
    const data = await fetchJson(url);
    return data.result || null;
  } catch (error) {
    console.log('[ACK] Table API unavailable for', table, '-', error.message, '; using JSONv2');
    const displayUrl = origin + '/' + table + '.do?sysparm_query=' +
        encodeURIComponent('sys_id=' + sysId) + '&JSONv2&sysparm_display_value=true';
    const rawUrl = origin + '/' + table + '.do?sysparm_query=' +
        encodeURIComponent('sys_id=' + sysId) + '&JSONv2';
    const displayData = await fetchJson(displayUrl);
    const rawData = await fetchJson(rawUrl);
    const display = (displayData.records && displayData.records[0]) || null;
    const raw = (rawData.records && rawData.records[0]) || null;
    if (!display) return raw;
    if (!raw) return display;
    Object.keys(raw).forEach(function (field) {
      if (SYS_ID_PATTERN.test(raw[field])) {
        display[field] = {
          value: raw[field],
          display_value: display[field]
        };
      }
    });
    return display;
  }
};

const fetchJournal = async (origin, caseSysId) => {
  const url = origin + '/sys_journal_field.do?sysparm_query=' +
      encodeURIComponent('element_id=' + caseSysId) +
      '&JSONv2&sysparm_display_value=true&sysparm_limit=1000';
  const data = await fetchJson(url);
  return data.records || [];
};

const assetSysIdFromCase = (caseRecord) => {
  const names = [
    'asset',
    'cmdb_ci',
    'configuration_item',
    'u_asset',
    'u_cmdb_ci',
    'u_telecom_business_service',
    'u_business_service',
    'business_service'
  ];
  for (let i = 0; i < names.length; i++) {
    const sysId = sysIdField(caseRecord, names[i]);
    if (sysId) return { field: names[i], sysId: sysId };
  }
  return { field: '', sysId: '' };
};

const extractServiceType = (disposalReason) => {
  if (!disposalReason) return '';
  const match = disposalReason.match(/Product Flavour\s*:\s*(.+?)(?:\s*Source Type|$)/i);
  return match ? match[1].trim() : '';
};

// ============ ENHANCED DIAGNOSTIC PARSING ============

const decodeHtml = (html) => {
  const template = document.createElement('textarea');
  template.innerHTML = html || '';
  return template.value;
};

const textFromHtml = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html || '', 'text/html');
  return (doc.body && doc.body.textContent) ? doc.body.textContent : (html || '');
};

// Enhanced log cleaning - removes HTML, markdown, FLT metadata, duplicates
const cleanRawLog = (logText) => {
  if (!logText) return '';
  
  let cleaned = logText;
  
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Remove FLT ID prefixes
  cleaned = cleaned.replace(/FLT ID:\s*[\w\d]+/gi, '');
  
  // Remove "Logs [code]" prefixes
  cleaned = cleaned.replace(/Logs\s*\[code\]/gi, '');
  
  // Remove "Insights: Diagnostic Update Message Logs" prefixes
  cleaned = cleaned.replace(/Insights:\s*Diagnostic Update Message Logs/gi, '');
  
  // Remove markdown bold markers
  cleaned = cleaned.replace(/\*\*/g, '');
  
  // Remove "by INSIGHTS" suffix
  cleaned = cleaned.replace(/by\s*INSIGHTS/gi, '');
  
  // Remove ANSI color codes (from Drivenets)
  cleaned = cleaned.replace(/\[\d+m/g, '');
  
  // Remove B: or B prefixes (router prompt artifacts)
  cleaned = cleaned.replace(/^B\s*$/gm, '');
  cleaned = cleaned.replace(/^B:#$/gm, '');
  
  // Remove duplicate command lines
  const lines = cleaned.split('\n').filter(l => l.trim());
  const uniqueLines = [];
  const seenCommands = new Set();
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Check if this is a command line (starts with hostname# or hostname>)
    if (/^[\w\-]+#\s*/.test(trimmed) || /^[\w\-]+>\s*/.test(trimmed)) {
      const commandKey = trimmed.replace(/^[\w\-]+[>#]\s*/, '').trim();
      if (!seenCommands.has(commandKey)) {
        seenCommands.add(commandKey);
        uniqueLines.push(trimmed);
      }
    } else {
      uniqueLines.push(trimmed);
    }
  }
  
  cleaned = uniqueLines.join('\n');
  
  // Remove empty lines at start/end
  cleaned = cleaned.replace(/^\n+/, '').replace(/\n+$/, '');
  
  return cleaned.trim();
};

// Parse Insights Summary from work notes
const parseInsightsSummary = (workNoteText) => {
  const summary = {
    serviceStatus: null,
    protocolType: null,
    pingStatus: null,
    trafficStatus: null,
    peInterfaceVprn: null
  };
  
  if (!workNoteText) return summary;
  
  const text = workNoteText.toLowerCase();
  
  // Extract Service Status
  const serviceStatusMatch = workNoteText.match(/Service Status\s*:\s*(UP|DOWN|UP\s*\(|DOWN\s*\()/i);
  if (serviceStatusMatch) {
    summary.serviceStatus = serviceStatusMatch[1].replace(/\s*\(|\)/g, '').toUpperCase();
  }
  
  // Extract Protocol
  const protocolMatch = workNoteText.match(/Protocol\s*:\s*(BGP|STATIC|OTHER)/i);
  if (protocolMatch) {
    summary.protocolType = protocolMatch[1].toUpperCase();
  }
  
  // Extract Ping Status
  const pingMatch = workNoteText.match(/Ping\s*:\s*(UP|DOWN)/i);
  if (pingMatch) {
    summary.pingStatus = pingMatch[1].toUpperCase();
  }
  
  // Extract Traffic Status
  const trafficMatch = workNoteText.match(/Traffic on SW Port\s*:\s*(UP|DOWN)/i) ||
                      workNoteText.match(/Traffic\s*:\s*(UP|DOWN)/i);
  if (trafficMatch) {
    summary.trafficStatus = trafficMatch[1].toUpperCase();
  }
  
  // Extract PE Interface VPRN
  const vprnMatch = workNoteText.match(/PE Interface VPRN\s*:\s*(UP|DOWN)/i);
  if (vprnMatch) {
    summary.peInterfaceVprn = vprnMatch[1].toUpperCase();
  }
  
  return summary;
};

// Determine service status using priority order
const determineServiceStatus = (insightsSummary, diagnosticMessage, protocolState, pingStatus) => {
  // Priority 1: Insights Summary
  if (insightsSummary && insightsSummary.serviceStatus) {
    return insightsSummary.serviceStatus;
  }
  
  // Priority 2: Diagnostic Update message
  if (diagnosticMessage) {
    const msg = diagnosticMessage.toLowerCase();
    if (msg.includes('protocol is down') || msg.includes('unable to ping') || msg.includes('ping failed')) {
      return 'DOWN';
    }
    if (msg.includes('protocol is up') || msg.includes('no issue on lm') || msg.includes('ping response is ok')) {
      return 'UP';
    }
  }
  
  // Priority 3: Protocol state
  if (protocolState === 'DOWN') {
    return 'DOWN';
  }
  if (protocolState === 'UP') {
    // Check ping status for final determination
    if (pingStatus === 'DOWN') {
      return 'DOWN';
    }
    return 'UP';
  }
  
  // Priority 4: Ping result
  if (pingStatus === 'DOWN') {
    return 'DOWN';
  }
  if (pingStatus === 'UP') {
    return 'UP';
  }
  
  // Default: assume UP if we can't determine
  return 'UP';
};

// Parse BGP logs from various vendors
const parseBgpLogs = (logText) => {
  const result = {
    protocolType: 'BGP',
    peerIp: '',
    uptime: '',
    state: 'UNKNOWN',
    receivedRoutes: 0,
    rawLog: ''
  };
  
  if (!logText) return result;
  
  const text = logText.toLowerCase();
  
  // Nokia/HPE format: show router <id> bgp summary
  if (text.includes('show router') && text.includes('bgp summary')) {
    // Extract peer IP
    const ipMatch = logText.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (ipMatch) result.peerIp = ipMatch[1];
    
    // Extract uptime (format: 0298d19h or similar)
    const uptimeMatch = logText.match(/\b\d+[wdhms]+\b/i);
    if (uptimeMatch) result.uptime = uptimeMatch[0];
    
    // Extract received routes
    const routesMatch = logText.match(/(\d+)\s+\d+\s+\d+\s+/);
    if (routesMatch) result.receivedRoutes = parseInt(routesMatch[1], 10);
    
    // Check for BGP state
    if (logText.toLowerCase().includes('connect') || logText.toLowerCase().includes('idle') || logText.toLowerCase().includes('active')) {
      result.state = 'DOWN';
    } else if (result.receivedRoutes > 0 || result.uptime) {
      result.state = 'UP';
    }
  }
  
  // Drivenets format: show bgp summary | include
  else if (text.includes('show bgp summary') && text.includes('include')) {
    const ipMatch = logText.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (ipMatch) result.peerIp = ipMatch[1];
    
    const uptimeMatch = logText.match(/\b\d+[wdhms]+\b/i);
    if (uptimeMatch) result.uptime = uptimeMatch[0];
    
    const routesMatch = logText.match(/\d+\s+\d+\s+(\d+)/);
    if (routesMatch) result.receivedRoutes = parseInt(routesMatch[1], 10);
    
    if (result.receivedRoutes > 0 || result.uptime) {
      result.state = 'UP';
    }
  }
  
  // Generic BGP detection
  else if (text.includes('bgp')) {
    const ipMatch = logText.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (ipMatch) result.peerIp = ipMatch[1];
    
    if (logText.toLowerCase().includes('established')) {
      result.state = 'UP';
    }
  }
  
  result.rawLog = cleanRawLog(logText);
  return result;
};

// Parse Static routing logs
const parseStaticLogs = (logText) => {
  const result = {
    protocolType: 'STATIC',
    state: 'UNKNOWN',
    rawLog: ''
  };
  
  if (!logText) return result;
  
  const text = logText.toLowerCase();
  
  if (text.includes('static routes') || text.includes('no bgp output')) {
    result.state = 'UNKNOWN'; // Will be determined by ping
  }
  
  result.rawLog = cleanRawLog(logText);
  return result;
};

// Parse Ping logs from various vendors
const parsePingLogs = (logText) => {
  const result = {
    status: 'UNKNOWN',
    packetLoss: null,
    averageRtt: '',
    rawLog: ''
  };
  
  if (!logText) return result;
  
  const text = logText.toLowerCase();
  
  // Nokia/HPE format
  if (text.includes('packets transmitted') && text.includes('packets received')) {
    const txMatch = logText.match(/(\d+)\s+packets transmitted/i);
    const rxMatch = logText.match(/(\d+)\s+packets received/i);
    const lossMatch = logText.match(/(\d+(?:\.\d+)?)\s*%\s*packet loss/i);
    const avgMatch = logText.match(/avg\s*=\s*(\d+(?:\.\d+)?)\s*ms/i) ||
                    logText.match(/round-trip.*avg\s*=\s*(\d+(?:\.\d+)?)\s*ms/i);
    
    if (txMatch && rxMatch) {
      const tx = parseInt(txMatch[1], 10);
      const rx = parseInt(rxMatch[1], 10);
      
      if (lossMatch) {
        result.packetLoss = parseFloat(lossMatch[1]);
      } else {
        result.packetLoss = tx > 0 ? ((tx - rx) / tx) * 100 : 100;
      }
      
      if (result.packetLoss === 0) {
        result.status = 'UP';
      } else if (result.packetLoss === 100) {
        result.status = 'DOWN';
      } else {
        result.status = 'DEGRADED';
      }
    }
    
    if (avgMatch) {
      result.averageRtt = avgMatch[1] + 'ms';
    }
  }
  
  // Drivenets format
  else if (text.includes('packets transmitted') && text.includes('rtt min/avg/max')) {
    const lossMatch = logText.match(/(\d+(?:\.\d+)?)\s*%\s*packet loss/i);
    const avgMatch = logText.match(/rtt min\/avg\/max\/\w+\s*=\s*[\d.]+\/([\d.]+)\//i);
    
    if (lossMatch) {
      result.packetLoss = parseFloat(lossMatch[1]);
    }
    
    if (avgMatch) {
      result.averageRtt = avgMatch[1] + 'ms';
    }
    
    if (result.packetLoss === 0) {
      result.status = 'UP';
    } else if (result.packetLoss === 100) {
      result.status = 'DOWN';
    } else {
      result.status = 'DEGRADED';
    }
  }
  
  // Generic ping failure detection
  else if (text.includes('no answer yet') || text.includes('100% packet loss') || text.includes('unreachable')) {
    result.status = 'DOWN';
    result.packetLoss = 100;
  }
  
  result.rawLog = cleanRawLog(logText);
  return result;
};

// Parse work notes to extract all diagnostic data
const parseWorkNotes = (journalRecords) => {
  const notes = (journalRecords || []).filter(record => 
    record.element === 'work_notes' && 
    typeof record.value === 'string' &&
    (record.value.includes('Insights: Diagnostic Update') || 
     record.value.includes('Insights: Insights Conclusion'))
  );
  
  console.log('[ACK] Total journal records:', journalRecords.length);
  console.log('[ACK] Diagnostic entries found:', notes.length);
  
  let insightsSummary = null;
  let latestBgpLog = null;
  let latestPingLog = null;
  let latestDiagnosticMessage = '';
  
  // Process from newest to oldest
  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i];
    const value = note.value;
    
    // Parse Insights Summary
    if (value.includes('Insights: Insights Conclusion') && !insightsSummary) {
      insightsSummary = parseInsightsSummary(value);
      console.log('[ACK] Found Insights Summary:', insightsSummary);
    }
    
    // Parse Diagnostic Update
    if (value.includes('Insights: Diagnostic Update')) {
      // Extract message
      const messageMatch = value.match(/Message\s*([\s\S]*?)\s*Logs/i);
      if (messageMatch) {
        latestDiagnosticMessage = messageMatch[1].trim();
      }
      
      // Extract logs
      const logsMatch = value.match(/Logs\s*([\s\S]*?)(?:by INSIGHTS|$)/i);
      if (logsMatch) {
        const logs = logsMatch[1].trim();
        
        // Check if it's BGP or protocol logs
        if (logs.toLowerCase().includes('bgp') || 
            logs.toLowerCase().includes('show router') ||
            logs.toLowerCase().includes('show bgp')) {
          if (!latestBgpLog) {
            latestBgpLog = logs;
            console.log('[ACK] Found BGP logs');
          }
        }
        
        // Check if it's ping logs
        if (logs.toLowerCase().includes('ping') || 
            logs.toLowerCase().includes('unreachable') ||
            logs.toLowerCase().includes('packet loss')) {
          if (!latestPingLog) {
            latestPingLog = logs;
            console.log('[ACK] Found Ping logs');
          }
        }
        
        // Check for static routing
        if (logs.toLowerCase().includes('static routes') || 
            (logs.toLowerCase().includes('show bgp') && logs.toLowerCase().includes('no bgp'))) {
          if (!latestBgpLog) {
            latestBgpLog = logs; // Store as protocol log
            console.log('[ACK] Found Static routing logs');
          }
        }
      }
    }
  }
  
  // Parse protocol logs
  let protocolData = null;
  if (latestBgpLog) {
    if (latestBgpLog.toLowerCase().includes('static') || 
        latestBgpLog.toLowerCase().includes('no bgp')) {
      protocolData = parseStaticLogs(latestBgpLog);
    } else {
      protocolData = parseBgpLogs(latestBgpLog);
    }
  }
  
  // Parse ping logs
  let pingData = null;
  if (latestPingLog) {
    pingData = parsePingLogs(latestPingLog);
  }
  
  // Determine service status
  const serviceStatus = determineServiceStatus(
    insightsSummary,
    latestDiagnosticMessage,
    protocolData ? protocolData.state : null,
    pingData ? pingData.status : null
  );
  
  console.log('[ACK] Service Status:', serviceStatus);
  console.log('[ACK] Protocol Data:', protocolData);
  console.log('[ACK] Ping Data:', pingData);
  
  return {
    serviceStatus,
    insightsSummary,
    protocolData,
    pingData,
    diagnosticMessage: latestDiagnosticMessage
  };
};

const extractServiceData = (caseRecord, assetRecord) => {
  const combined = Object.assign({}, caseRecord || {}, assetRecord || {});
  const disposalReason = field(assetRecord, 'disposal_reason') ||
      field(caseRecord, 'disposal_reason');
  
  return {
    circuitId: firstFilled(combined, [
      'u_circuit_id', 'circuit_id', 'u_circuit', 'name', 'u_name', 'u_service_id'
    ]),
    customerName: firstFilled(combined, [
      'u_customer_site_name', 'u_customer_name', 'u_customer', 'customer', 'account', 'u_account', 'company', 'u_site_name'
    ]),
    location: firstFilled(combined, [
      'u_a_end_site_address', 'u_location', 'location', 'u_site', 'u_city', 'city', 'u_address', 'u_site_location', 'u_customer_site'
    ]),
    serviceType: extractServiceType(disposalReason) ||
        firstFilled(combined, [
          'u_service_type', 'service_type', 'u_product_type', 'product', 'u_product', 'type', 'u_type'
        ]),
    lastMileProvider: field(assetRecord, 'u_a_end_ll_provider') ||
        field(caseRecord, 'u_a_end_ll_provider'),
    managementType: field(assetRecord, 'u_management_type') ||
        field(caseRecord, 'u_management_type'),
    scope: field(assetRecord, 'u_scope_of_management') ||
        field(caseRecord, 'u_scope_of_management'),
    cpeManaged: toYesNo(
        field(assetRecord, 'u_cpe_managed') ||
        field(caseRecord, 'u_cpe_managed')
    ),
    circuitType: circuitType(assetRecord) ||
        circuitType(caseRecord),
    prisec: field(assetRecord, 'u_prisec') ||
        field(caseRecord, 'u_prisec'),
    bandwidth: field(assetRecord, 'u_bandwidth') ||
        field(caseRecord, 'u_bandwidth')
  };
};

// Template functions
const hasValue = (value) => {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  return text !== '' && text.toLowerCase() !== 'undefined' && text.toLowerCase() !== 'null';
};

const line = (label, value) => {
  if (!hasValue(value)) return '';
  return label + ': ' + String(value).trim();
};

const joinNonEmpty = (parts, separator) => {
  return parts.filter(hasValue).join(separator);
};

// Enhanced buildAcknowledgement with new format
const buildAcknowledgement = (data) => {
  const siteBits = joinNonEmpty(
    [data.customerName, data.location],
    ', '
  );

  const serviceLines = [
    line('Service Type', data.serviceType),
    line('Circuit Type', data.circuitType),
    line('Primary/Secondary', data.prisec),
    line('Bandwidth', data.bandwidth),
    line('Last Mile Provider', data.lastMileProvider)
  ].filter(Boolean);

  const blocks = [];
  blocks.push('Dear Customer,');
  blocks.push('');

  if (hasValue(data.circuitId)) {
    blocks.push('Regarding the reported issue for Circuit ID: ' + String(data.circuitId).trim());
  } else {
    blocks.push('Regarding the reported issue,');
  }

  blocks.push('');

  if (hasValue(siteBits)) {
    blocks.push('Customer Site:');
    blocks.push(siteBits);
    blocks.push('');
  }

  blocks.push('Issue Reported:');
  blocks.push('Customer reported service degradation/interruption.');
  blocks.push('');

  if (serviceLines.length) {
    blocks.push('Service Details:');
    serviceLines.forEach(function (line) { blocks.push(line); });
    blocks.push('');
  }

  blocks.push('Observation:');
  blocks.push('');
  blocks.push('Based on the diagnostic checks performed, the service is currently ' + (data.serviceStatus || 'UP') + '.');
  blocks.push('');

  // Protocol Status section
  if (data.protocolData && hasValue(data.protocolData.protocolType)) {
    blocks.push('Protocol Status:');
    blocks.push('');
    blocks.push('Protocol Type:');
    blocks.push(data.protocolData.protocolType);
    blocks.push('');
    blocks.push('Protocol State:');
    blocks.push(data.protocolData.state || 'UNKNOWN');
    blocks.push('');
    
    if (hasValue(data.protocolData.peerIp)) {
      blocks.push('Peer Details:');
      blocks.push('Peer IP: ' + data.protocolData.peerIp);
      if (hasValue(data.protocolData.uptime)) {
        blocks.push('Uptime: ' + data.protocolData.uptime);
      }
      blocks.push('');
    }
    
    if (hasValue(data.protocolData.rawLog)) {
      blocks.push('Protocol Logs:');
      blocks.push('');
      blocks.push(data.protocolData.rawLog);
      blocks.push('');
    }
  }

  // Endpoint Reachability section
  if (data.pingData) {
    blocks.push('Endpoint Reachability:');
    blocks.push('');
    blocks.push('Ping Status:');
    blocks.push(data.pingData.status || 'UNKNOWN');
    blocks.push('');
    
    if (data.pingData.packetLoss !== null) {
      blocks.push('Packet Loss:');
      blocks.push(data.pingData.packetLoss + '%');
      blocks.push('');
    }
    
    if (hasValue(data.pingData.averageRtt)) {
      blocks.push('Average RTT:');
      blocks.push(data.pingData.averageRtt);
      blocks.push('');
    }
    
    if (hasValue(data.pingData.rawLog)) {
      blocks.push('Ping Logs:');
      blocks.push('');
      blocks.push(data.pingData.rawLog);
      blocks.push('');
    }
  }
  
  blocks.push('Next Action:');
  blocks.push('');
  blocks.push('We are currently checking the reported issue with the concerned team and validating the diagnostic findings. We will share the next update once further analysis is completed.');

  return blocks.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
};

const copyText = async (text) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);
};

const getCaseContext = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('No active tab found.');

  let origin = '';
  try {
    origin = new URL(tab.url).origin;
  } catch (e) {}

  let sysId = parseSysIdFromUrl(tab.url);

  if (!sysId && tab.id && chrome.scripting) {
    try {
      const injected = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: readPageContext
      });
      for (let i = 0; i < (injected || []).length; i++) {
        const result = injected[i] && injected[i].result;
        if (result && result.sysId) {
          sysId = result.sysId;
          origin = result.origin || origin;
          break;
        }
      }
    } catch (error) {
      console.log('[ACK] Could not inspect page for sys_id:', error.message);
    }
  }

  if (!origin || origin.indexOf('service-now.com') === -1) {
    const stored = await chrome.storage.sync.get(['rooturl']);
    if (stored.rooturl) origin = String(stored.rooturl).replace(/\/$/, '');
  }

  if (!sysId) {
    throw new Error('Open a ServiceNow case tab, then click Generate Initial Acknowledgement.');
  }
  if (!origin) {
    throw new Error('Could not determine ServiceNow instance URL.');
  }

  return { origin: origin.replace(/\/$/, ''), sysId: sysId };
};

export const generateInitialAcknowledgement = async () => {
  try {
    const context = await getCaseContext();
    console.log('[ACK] Case sys_id:', context.sysId);

    const caseRecord = await fetchTableRecord(
      context.origin,
      'sn_customerservice_case',
      context.sysId
    );
    if (!caseRecord) throw new Error('Case API returned no record.');

    const assetRef = assetSysIdFromCase(caseRecord);
    console.log('[ACK] Asset:', assetRef);

    let assetRecord = null;
    if (assetRef.sysId) {
      assetRecord = await fetchTableRecord(
        context.origin,
        'u_telecom_business_service',
        assetRef.sysId
      );
    }

    const service = extractServiceData(caseRecord, assetRecord);
    console.log('[ACK] Circuit:', service.circuitId);

    const journal = await fetchJournal(context.origin, context.sysId);
    const diagnostics = parseWorkNotes(journal);

    const acknowledgement = buildAcknowledgement({
      circuitId: service.circuitId,
      customerName: service.customerName,
      location: service.location,
      serviceType: service.serviceType,
      lastMileProvider: service.lastMileProvider,
      managementType: service.managementType,
      scope: service.scope,
      cpeManaged: service.cpeManaged,
      circuitType: service.circuitType,
      prisec: service.prisec,
      bandwidth: service.bandwidth,
      serviceStatus: diagnostics.serviceStatus,
      protocolData: diagnostics.protocolData,
      pingData: diagnostics.pingData
    });

    console.log('[ACK] Final acknowledgement:\n' + acknowledgement);
    await copyText(acknowledgement);
    return acknowledgement;
  } catch (error) {
    console.error('[ACK] Error generating acknowledgement:', error);
    throw error;
  }
};

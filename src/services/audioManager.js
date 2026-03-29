// Audio Manager Service - Using Offscreen Documents (Manifest V3)
// Matches old extension exactly

// Main audio notification function
export async function playAudio(options = {}) {
  try {
    console.log('🎵 === AUDIO PLAYBACK START ===');
    console.log('🔧 Audio options:', options);
    
    // Get audio data and settings
    const { audioData, settings } = await getAudioForPlayback();
    
    // Check if offscreen document exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    console.log('📋 Offscreen contexts found:', existingContexts.length);

    if (existingContexts.length === 0) {
      console.log('🔧 Creating offscreen document...');
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('offscreen.html'),
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Playing audio notifications for ServiceNow updates'
      });
      console.log('✅ Offscreen document created');
    } else {
      console.log('ℹ️ Offscreen document already exists');
    }

    // Send message to offscreen document with audio data and settings
    const message = {
      type: "PLAY_AUDIO",
      audioData: audioData,
      settings: {
        loop: options.loop !== false,
        volume: options.volume || settings.volume || 0.5,
        duration: options.duration || settings.audioDuration
      }
    };

    console.log('📤 Sending audio message:', message);
    await chrome.runtime.sendMessage(message);
    console.log('✅ Audio playback started');
    
  } catch (error) {
    console.error('❌ === AUDIO PLAYBACK ERROR ===');
    console.error('💥 Error playing audio:', error);
    console.error('🌐 Stack trace:', error.stack);
    throw error;
  }
}

// Stop audio notification function
export async function stopAudio() {
  try {
    console.log('🛑 === AUDIO STOP START ===');
    
    const result = await chrome.runtime.sendMessage({ type: "STOP_AUDIO" });
    console.log('✅ Audio stop message sent successfully');
    
    // Wait a moment for the message to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify audio stopped by checking offscreen contexts
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });
    
    console.log('📋 Offscreen contexts after stop:', contexts.length);
    console.log('✅ Audio stop completed');
    return true;
  } catch (error) {
    console.error('❌ === AUDIO STOP ERROR ===');
    console.error('💥 Error stopping audio:', error);
    console.error('🌐 Stack trace:', error.stack);
    return false;
  }
}

// Test audio notification function
export async function testAudio() {
  try {
    console.log('🔊 Testing audio notification...');
    const result = await playAudio({ loop: false, duration: 5 });
    if (result) {
      console.log('✅ Audio test completed successfully');
    } else {
      console.log('❌ Audio test failed');
    }
    return result;
  } catch (error) {
    console.error('❌ Error testing audio:', error);
    return false;
  }
}

// Load custom audio file
export async function loadCustomAudio(file) {
  try {
    console.log('🎵 === CUSTOM AUDIO LOAD START ===');
    console.log('📁 File info:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });
    
    // Validate file type
    const validAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    if (!validAudioTypes.includes(file.type)) {
      console.error('❌ Invalid audio file type:', file.type);
      throw new Error(`Invalid audio file type: ${file.type}. Supported types: ${validAudioTypes.join(', ')}`);
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      console.error('❌ Audio file too large:', `${(file.size / 1024 / 1024).toFixed(2)}MB`);
      throw new Error(`Audio file too large. Maximum size: 10MB`);
    }
    
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async (event) => {
        try {
          console.log('📖 File read completed, processing data...');
          const arrayBuffer = event.target.result;
          
          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            throw new Error('Audio file is empty or corrupted');
          }
          
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );
          
          console.log('💾 Converting to base64:', {
            originalSize: arrayBuffer.byteLength,
            base64Size: base64.length,
            compressionRatio: `${((base64.length / arrayBuffer.byteLength) * 100).toFixed(1)}%`
          });
          
          // Store custom audio data with validation
          await chrome.storage.local.set({
            audioData: {
              data: base64,
              type: file.type,
              name: file.name,
              size: file.size,
              loadedAt: new Date().toISOString()
            }
          });
          
          console.log('✅ Custom audio loaded successfully:', {
            name: file.name,
            type: file.type,
            size: `${(file.size / 1024).toFixed(2)}KB`
          });
          resolve(true);
        } catch (error) {
          console.error('❌ === AUDIO PROCESSING ERROR ===');
          console.error('💥 Error processing audio file:', error);
          console.error('🌐 Stack trace:', error.stack);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('❌ === FILE READER ERROR ===');
        console.error('💥 FileReader error:', error);
        reject(new Error(`Failed to read audio file: ${error}`));
      };
      
      reader.onabort = () => {
        console.warn('⚠️ File reading was aborted');
        reject(new Error('Audio file reading was aborted'));
      };
      
      console.log('📖 Starting to read file as array buffer...');
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    console.error('❌ === CUSTOM AUDIO LOAD ERROR ===');
    console.error('💥 Error loading custom audio:', error);
    console.error('🌐 Stack trace:', error.stack);
    return false;
  }
}

// Get audio for playback (matches old extension)
export async function getAudioForPlayback() {
  try {
    console.log('🎵 === GET AUDIO DATA START ===');
    
    const result = await chrome.storage.local.get(['audioData', 'settings']);
    console.log('📊 Retrieved data:', {
      hasAudioData: !!result.audioData,
      audioDataName: result.audioData?.name || 'none',
      audioDataType: result.audioData?.type || 'none',
      hasSettings: !!result.settings,
      settingsKeys: Object.keys(result.settings || {})
    });
    
    const audioData = result.audioData || null;
    const settings = result.settings || {};
    
    // Validate audio data integrity
    if (audioData && (!audioData.data || !audioData.type)) {
      console.warn('⚠️ Audio data is corrupted or incomplete');
      return {
        audioData: null,
        settings: settings
      };
    }
    
    console.log('✅ Audio data retrieved successfully:', {
      audioName: audioData?.name || 'default',
      audioType: audioData?.type || 'default',
      settingsCount: Object.keys(settings).length
    });
    
    return {
      audioData: audioData,
      settings: settings
    };
  } catch (error) {
    console.error('❌ === GET AUDIO DATA ERROR ===');
    console.error('💥 Error getting audio data:', error);
    console.error('🌐 Stack trace:', error.stack);
    return {
      audioData: null,
      settings: {}
    };
  }
}

// Cleanup function
export async function cleanup() {
  try {
    await stopAudio();
    console.log('🧹 Audio cleanup completed');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

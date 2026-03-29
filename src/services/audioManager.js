// Audio Manager Service - Using Offscreen Documents (Manifest V3)
// Matches old extension exactly

// Main audio notification function
export async function playAudio(settings = {}) {
  try {
    // Get audio settings from storage
    const result = await chrome.storage.local.get(['audioData', 'settings']);
    const audioData = result.audioData || null;
    const audioSettings = result.settings || {};
    
    // Create offscreen document if it doesn't exist
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingContexts.length === 0) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Playing audio notifications for ServiceNow updates'
      });
      console.log('📄 Created offscreen document for audio playback');
    }

    // Send message to offscreen document with audio data and settings
    await chrome.runtime.sendMessage({ 
      type: "PLAY_AUDIO",
      audioData: audioData,
      settings: { ...audioSettings, ...settings }
    });
    console.log('🎵 Audio notification sent to offscreen document');
    return true;
  } catch (error) {
    console.log('❌ Could not play audio notification:', error);
    return false;
  }
}

// Stop audio notification function
export async function stopAudio() {
  try {
    await chrome.runtime.sendMessage({ type: "STOP_AUDIO" });
    console.log('� Audio stop notification sent to offscreen document');
    return true;
  } catch (error) {
    console.log('❌ Could not stop audio notification:', error);
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
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );
          
          // Store custom audio data
          await chrome.storage.local.set({
            audioData: {
              data: base64,
              type: file.type,
              name: file.name
            }
          });
          
          console.log('🎵 Custom audio loaded:', file.name);
          resolve(true);
        } catch (error) {
          console.error('❌ Error processing audio file:', error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    console.error('❌ Error loading custom audio:', error);
    return false;
  }
}

// Get audio for playback (matches old extension)
export async function getAudioForPlayback() {
  try {
    const result = await chrome.storage.local.get(['audioData', 'settings']);
    return {
      audioData: result.audioData || null,
      settings: result.settings || {}
    };
  } catch (error) {
    console.error('❌ Error getting audio data:', error);
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

// Offscreen Document for Audio Playback - Manifest V3
// Matches old extension exactly - simplified

let currentAudio = null;
let audioTimeout = null;

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Offscreen received message:', message.type);
  
  if (message && message.type === "PLAY_AUDIO") {
    playAudioNotification(message.audioData, message.settings);
    sendResponse({ success: true });
  } else if (message && message.type === "STOP_AUDIO") {
    stopCurrentAudio();
    sendResponse({ success: true });
  }
});

// Play audio notification - matches old extension exactly
async function playAudioNotification(audioData = null, settings = null) {
  try {
    // Stop any existing audio and clear timeout
    stopCurrentAudio();
    
    // Use provided audio data or default
    let audioUrl;
    if (audioData && audioData.data) {
      // Use the actual MIME type from the uploaded file
      audioUrl = `data:${audioData.type};base64,${audioData.data}`;
    } else {
      audioUrl = chrome.runtime.getURL('sound/alarm-deep_groove.mp3');
    }
    
    console.log('🎵 Audio URL:', audioUrl);
    console.log('🎵 Audio type:', audioData?.type || 'default');
    
    // Use provided settings or defaults
    const playbackSettings = {
      volume: (settings?.volume || 70) / 100, // Convert percentage to decimal (0-1)
      duration: settings?.duration || 5000,
      loop: settings?.loop || false
    };
    
    console.log('🔧 Audio settings:', playbackSettings);
    
    currentAudio = new Audio(audioUrl);
    currentAudio.volume = playbackSettings.volume;
    currentAudio.loop = playbackSettings.loop;
    
    await currentAudio.play();
    console.log('✅ Audio played successfully in offscreen document');
    
    // Set timeout to stop audio after specified duration (if not looping)
    if (!playbackSettings.loop && playbackSettings.duration > 0) {
      audioTimeout = setTimeout(() => {
        stopCurrentAudio();
      }, playbackSettings.duration);
    }
    
  } catch (error) {
    console.error('❌ Could not play audio in offscreen document:', error);
  }
}

function stopCurrentAudio() {
  try {
    // Clear any pending timeout
    if (audioTimeout) {
      clearTimeout(audioTimeout);
      audioTimeout = null;
    }
    
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
      console.log('🔇 Audio stopped successfully in offscreen document');
    }
  } catch (error) {
    console.error('❌ Could not stop audio in offscreen document:', error);
  }
}

console.log('🎵 Offscreen document loaded and ready');

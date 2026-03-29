// Offscreen Document for Audio Playback - Manifest V3
// Handles audio playback in offscreen context

let audioContext = null;
let currentSource = null;
let gainNode = null;
let isPlaying = false;

// Initialize audio context
function initializeAudio() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🎵 Offscreen audio context initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing offscreen audio context:', error);
  }
}

// Load audio from base64 or URL
async function loadAudio(audioData) {
  try {
    initializeAudio();
    
    let arrayBuffer;
    
    if (audioData && audioData.data) {
      // Load from base64
      const binaryString = atob(audioData.data);
      arrayBuffer = new ArrayBuffer(binaryString.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        view[i] = binaryString.charCodeAt(i);
      }
    } else {
      // Load default audio file
      const response = await fetch(chrome.runtime.getURL('/sound/alarm-deep_groove.mp3'));
      arrayBuffer = await response.arrayBuffer();
    }
    
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    console.log('🎵 Audio loaded successfully');
    return audioBuffer;
  } catch (error) {
    console.error('❌ Error loading audio:', error);
    return null;
  }
}

// Play audio with settings
async function playAudioWithSettings(audioData, settings = {}) {
  try {
    // Stop any existing audio
    stopCurrentAudio();
    
    const audioBuffer = await loadAudio(audioData);
    if (!audioBuffer) {
      console.error('❌ Could not load audio buffer');
      return;
    }
    
    // Create audio source
    currentSource = audioContext.createBufferSource();
    currentSource.buffer = audioBuffer;
    
    // Create gain node for volume control
    gainNode = audioContext.createGain();
    gainNode.gain.value = settings.volume || 0.5;
    
    // Connect nodes
    currentSource.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Handle looping
    currentSource.loop = settings.loop !== false; // Default to true
    
    // Handle duration (if specified)
    if (settings.duration && settings.duration > 0) {
      setTimeout(() => {
        stopCurrentAudio();
      }, settings.duration * 1000);
    }
    
    // Start playback
    currentSource.start(0);
    isPlaying = true;
    
    // Handle end of playback
    currentSource.onended = () => {
      if (!currentSource.loop) {
        isPlaying = false;
        currentSource = null;
        gainNode = null;
      }
    };
    
    console.log('🎵 Audio playing with settings:', settings);
  } catch (error) {
    console.error('❌ Error playing audio:', error);
  }
}

// Stop current audio
function stopCurrentAudio() {
  try {
    if (currentSource) {
      currentSource.stop();
      currentSource = null;
      gainNode = null;
      isPlaying = false;
      console.log('🛑 Audio stopped');
    }
  } catch (error) {
    console.error('❌ Error stopping audio:', error);
  }
}

// Message listener from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Offscreen received message:', message.type);
  
  switch (message.type) {
    case "PLAY_AUDIO":
      playAudioWithSettings(message.audioData, message.settings);
      sendResponse({ success: true });
      break;
      
    case "STOP_AUDIO":
      stopCurrentAudio();
      sendResponse({ success: true });
      break;
      
    default:
      console.warn('⚠️ Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  stopCurrentAudio();
  if (audioContext) {
    audioContext.close();
  }
});

console.log('🎵 Offscreen audio service ready');

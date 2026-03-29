// Audio Manager Service - Migrated from original audio-manager.js

let audioContext = null;
let currentAudio = null;
let audioBuffer = null;

export async function initializeAudio() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🎵 Audio context initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing audio context:', error);
  }
}

export async function loadAudioFile(audioUrl) {
  try {
    await initializeAudio();
    
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    console.log('🎵 Audio file loaded:', audioUrl);
    return true;
  } catch (error) {
    console.error('❌ Error loading audio file:', error);
    return false;
  }
}

export async function playAudio(settings = {}) {
  try {
    if (currentAudio) {
      stopAudio();
    }

    await initializeAudio();

    // Load default audio if no buffer exists
    if (!audioBuffer) {
      const loaded = await loadAudioFile('/sound/alarm-deep_groove.mp3');
      if (!loaded) {
        console.error('❌ Could not load audio file');
        return false;
      }
    }

    // Create audio source
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Create gain node for volume control
    const gainNode = audioContext.createGain();
    const volume = (settings.volume || 70) / 100;
    gainNode.gain.value = volume;

    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Handle loop
    const loopAudio = settings.loopAudio || false;
    source.loop = loopAudio;

    // Start playback
    source.start();
    currentAudio = source;

    // Handle playback end
    source.onended = () => {
      if (!loopAudio) {
        currentAudio = null;
        console.log('🔇 Audio playback completed');
      }
    };

    // Auto-stop after duration if specified
    const playbackDuration = settings.playbackDuration || 5;
    if (playbackDuration > 0 && !loopAudio) {
      setTimeout(() => {
        if (currentAudio === source) {
          stopAudio();
        }
      }, playbackDuration * 1000);
    }

    console.log('🔊 Audio playing with settings:', settings);
    return true;
  } catch (error) {
    console.error('❌ Error playing audio:', error);
    return false;
  }
}

export function stopAudio() {
  try {
    if (currentAudio) {
      currentAudio.stop();
      currentAudio = null;
      console.log('🔇 Audio stopped');
    }
  } catch (error) {
    console.error('❌ Error stopping audio:', error);
  }
}

export async function testAudio(settings) {
  try {
    console.log('🧪 Testing audio with settings:', settings);
    const success = await playAudio(settings);
    
    if (!success) {
      console.error('❌ Audio test failed');
      return false;
    }
    
    console.log('✅ Audio test successful');
    return true;
  } catch (error) {
    console.error('❌ Error testing audio:', error);
    return false;
  }
}

export async function loadCustomAudio(audioData) {
  try {
    await initializeAudio();
    
    const arrayBuffer = audioData instanceof ArrayBuffer 
      ? audioData 
      : await audioData.arrayBuffer();
    
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    console.log('🎵 Custom audio loaded');
    return true;
  } catch (error) {
    console.error('❌ Error loading custom audio:', error);
    return false;
  }
}

export function getAudioState() {
  return {
    isPlaying: currentAudio !== null,
    hasAudioBuffer: audioBuffer !== null,
    audioContextReady: audioContext !== null && audioContext.state === 'running'
  };
}

export async function resumeAudioContext() {
  try {
    if (audioContext && audioContext.state === 'suspended') {
      await audioContext.resume();
      console.log('🎵 Audio context resumed');
    }
  } catch (error) {
    console.error('❌ Error resuming audio context:', error);
  }
}

// Cleanup on extension unload
export function cleanupAudio() {
  try {
    stopAudio();
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    audioBuffer = null;
    console.log('🧹 Audio resources cleaned up');
  } catch (error) {
    console.error('❌ Error cleaning up audio:', error);
  }
}

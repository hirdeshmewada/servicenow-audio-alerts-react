import React, { useState, useEffect } from 'react';

const AudioSettings = ({ settings, onSave }) => {
  const [audioSettings, setAudioSettings] = useState({
    volume: 70,
    playbackDuration: 5,
    loopAudio: false,
    audioSource: 'default'
  });

  useEffect(() => {
    setAudioSettings({
      volume: settings.volume || 70,
      playbackDuration: settings.playbackDuration || 5,
      loopAudio: settings.loopAudio || false,
      audioSource: settings.audioSource || 'default'
    });
  }, [settings]);

  const handleSave = () => {
    onSave(audioSettings);
  };

  const handleTestAudio = async () => {
    console.log('🔊 Testing audio with settings:', audioSettings);
    try {
      // Send message to background script to test audio
      await chrome.runtime.sendMessage({
        action: 'testAudio',
        settings: {
          volume: audioSettings.volume,
          playbackDuration: audioSettings.playbackDuration,
          loopAudio: false // Don't loop for test
        }
      });
      console.log('✅ Audio test message sent to background');
    } catch (error) {
      console.error('❌ Error testing audio:', error);
    }
  };

  return (
    <div className="audio-settings">
      <div className="settings-section">
        <h3>Audio Selection</h3>
        
        <div className="form-group">
          <label className="form-label">Audio Source</label>
          <select 
            className="form-control"
            value={audioSettings.audioSource}
            onChange={(e) => setAudioSettings(prev => ({ ...prev, audioSource: e.target.value }))}
          >
            <option value="default">Default Alarm Sound</option>
            <option value="custom">Custom Audio File</option>
          </select>
        </div>

        {audioSettings.audioSource === 'default' && (
          <div className="audio-preview">
            <h4>Default Alarm</h4>
            <p>Standard ServiceNow alert sound</p>
            <button className="btn btn-secondary" onClick={handleTestAudio}>
              🔊 Test Default
            </button>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Playback Settings</h3>
        
        <div className="form-group">
          <label className="form-label">
            Playback Duration: {audioSettings.playbackDuration} seconds
          </label>
          <input
            type="range"
            min="1"
            max="60"
            value={audioSettings.playbackDuration}
            onChange={(e) => setAudioSettings(prev => ({ ...prev, playbackDuration: parseInt(e.target.value) }))}
            className="form-slider"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Volume: {audioSettings.volume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={audioSettings.volume}
            onChange={(e) => setAudioSettings(prev => ({ ...prev, volume: parseInt(e.target.value) }))}
            className="form-slider"
          />
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={audioSettings.loopAudio}
              onChange={(e) => setAudioSettings(prev => ({ ...prev, loopAudio: e.target.checked }))}
            />
            <span className="checkbox-custom"></span>
            Loop audio until manually stopped
          </label>
        </div>

        <div className="test-section">
          <button className="btn btn-primary" onClick={handleTestAudio}>
            🔊 Test Current Settings
          </button>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-secondary" onClick={() => setAudioSettings({
          volume: 70,
          playbackDuration: 5,
          loopAudio: false,
          audioSource: 'default'
        })}>
          🔄 Reset to Defaults
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          💾 Save Settings
        </button>
      </div>
    </div>
  );
};

export default AudioSettings;

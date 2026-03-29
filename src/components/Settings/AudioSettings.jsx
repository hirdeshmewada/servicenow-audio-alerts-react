import React, { useState, useEffect } from 'react';

const AudioSettings = ({ settings, onSave }) => {
  const [audioSettings, setAudioSettings] = useState({
    volume: settings.volume || 70,
    playbackDuration: settings.playbackDuration || 5,
    loopAudio: settings.loopAudio || false,
    audioSource: settings.audioSource || 'default'
  });

  const handleSave = () => {
    console.log('💾 Saving audio settings:', audioSettings);
    onSave(audioSettings);
  };

  const handleTestAudio = () => {
    console.log('🔊 Testing audio with settings:', audioSettings);
    // Fire and forget - like old extension
    chrome.runtime.sendMessage({
      type: 'PLAY_AUDIO',
      settings: {
        volume: audioSettings.volume,
        playbackDuration: audioSettings.playbackDuration,
        loopAudio: false
      }
    });
    console.log('✅ Audio test request sent');
  };

  return (
    <div className="audio-settings">
      <div className="settings-section">
        <h3>🔊 Audio Settings</h3>
        
        <div className="form-group">
          <label className="form-label">
            Volume: {audioSettings.volume}%
          </label>
          <input
            type="range"
            className="form-slider"
            min="0"
            max="100"
            value={audioSettings.volume}
            onChange={(e) => setAudioSettings(prev => ({ ...prev, volume: parseInt(e.target.value) }))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Playback Duration: {audioSettings.playbackDuration} seconds
          </label>
          <input
            type="range"
            className="form-slider"
            min="1"
            max="60"
            value={audioSettings.playbackDuration}
            onChange={(e) => setAudioSettings(prev => ({ ...prev, playbackDuration: parseInt(e.target.value) }))}
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
      </div>

      <div className="settings-section">
        <h3>🧪 Testing</h3>
        
        <div className="test-controls">
          <button className="btn btn-secondary" onClick={handleTestAudio}>
            🔊 Test Audio
          </button>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-primary" onClick={handleSave}>
          💾 Save Settings
        </button>
      </div>
    </div>
  );
};

export default AudioSettings;

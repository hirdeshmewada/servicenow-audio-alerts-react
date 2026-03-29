import React, { useState, useEffect } from 'react';
import { playAudio } from '../../services/audioManager';
import { useChromeStorage } from '../../hooks/useChromeStorage';
import './Sound.css';

const Sound = () => {
  const [audioSettings, setAudioSettings] = useState({
    audioSource: 'default',
    volume: 70,
    playbackDuration: 5,
    loopAudio: false
  });
  
  const { getSettings, saveSettings } = useChromeStorage();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await getSettings();
    setAudioSettings({
      audioSource: settings.audioSource || 'default',
      volume: settings.volume || 70,
      playbackDuration: settings.playbackDuration || 5,
      loopAudio: settings.loopAudio || false
    });
  };

  const handleSave = async () => {
    await saveSettings(audioSettings);
    alert('Sound settings saved successfully!');
  };

  const handleTestAudio = async () => {
    console.log('🔊 Testing audio with settings:', audioSettings);
    try {
      const success = await playAudio({
        volume: audioSettings.volume,
        playbackDuration: audioSettings.playbackDuration,
        loopAudio: false
      });
      if (success) {
        console.log('✅ Audio test successful');
      } else {
        console.error('❌ Audio test failed');
      }
    } catch (error) {
      console.error('❌ Error testing audio:', error);
    }
  };

  const handleReset = () => {
    setAudioSettings({
      audioSource: 'default',
      volume: 70,
      playbackDuration: 5,
      loopAudio: false
    });
  };

  return (
    <div className="sound-page">
      <div className="page-header">
        <h2>Sound Settings</h2>
        <p>Configure audio notifications and custom sounds</p>
      </div>

      <div className="sound-sections">
        {/* Audio Selection */}
        <div className="sound-section">
          <div className="section-title">Audio Selection</div>
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

          {/* Default Audio Preview */}
          {audioSettings.audioSource === 'default' && (
            <div className="audio-preview-section">
              <div className="audio-preview">
                <h4>Default Alarm</h4>
                <p>Standard ServiceNow alert sound</p>
                <button className="btn btn-secondary" onClick={handleTestAudio}>
                  🔊 Test Default
                </button>
              </div>
            </div>
          )}

          {/* Custom Audio Upload */}
          {audioSettings.audioSource === 'custom' && (
            <div className="audio-upload-section">
              <div className="upload-area">
                <div className="upload-content">
                  <div className="upload-icon">📁</div>
                  <h4>Upload Custom Audio</h4>
                  <p>Drag & drop MP3 or WAV files here (max 5MB)</p>
                  <button className="btn btn-secondary">
                    📂 Select File
                  </button>
                </div>
              </div>

              {/* Custom Audio List */}
              <div className="custom-audio-list">
                <h4>Uploaded Audio Files</h4>
                <div className="audio-files-grid">
                  <div className="empty-state">No custom audio files uploaded yet</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Playback Settings */}
        <div className="sound-section">
          <div className="section-title">Playback Settings</div>
          <div className="playback-controls">
            <div className="form-group">
              <label className="form-label">Playback Duration (seconds)</label>
              <div className="slider-container">
                <input 
                  type="range" 
                  min="1" 
                  max="60" 
                  value={audioSettings.playbackDuration}
                  onChange={(e) => setAudioSettings(prev => ({ ...prev, playbackDuration: parseInt(e.target.value) }))}
                  className="form-slider"
                />
                <div className="slider-value">
                  <span>{audioSettings.playbackDuration}</span>s
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Volume</label>
              <div className="slider-container">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={audioSettings.volume}
                  onChange={(e) => setAudioSettings(prev => ({ ...prev, volume: parseInt(e.target.value) }))}
                  className="form-slider"
                />
                <div className="slider-value">
                  <span>{audioSettings.volume}</span>%
                </div>
              </div>
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
        </div>

        {/* File Management */}
        <div className="sound-section">
          <div className="section-title">File Management</div>
          <div className="files-management">
            <div className="files-grid">
              <div className="empty-state">No files to manage</div>
            </div>
            <div className="storage-info">
              <div className="storage-stats">
                <div className="stat-item">
                  <span className="stat-label">Files Uploaded:</span>
                  <span>0</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Size:</span>
                  <span>0 MB</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Max Files:</span>
                  <span>5</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={handleReset}>
            🔄 Reset to Defaults
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            💾 Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sound;

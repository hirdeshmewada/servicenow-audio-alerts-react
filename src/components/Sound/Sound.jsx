import React, { useState, useEffect } from 'react';
import { playAudio, loadCustomAudio } from '../../services/audioManager';
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
    
    // Set up storage listener for dynamic updates
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'sync' && changes.settings) {
        console.log('🔄 Sound settings changed in sync storage, updating UI...');
        loadSettings();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // Cleanup listener on unmount
    return () => {
      if (chrome.storage.onChanged.hasListener(handleStorageChange)) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
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

  const handleAutoSave = async (newSettings) => {
    try {
      await saveSettings(newSettings);
      console.log('✅ Settings auto-saved:', newSettings);
    } catch (error) {
      console.error('❌ Error auto-saving settings:', error);
    }
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

  const handleReset = () => {
    setAudioSettings({
      audioSource: 'default',
      volume: 70,
      playbackDuration: 5,
      loopAudio: false
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log('📁 Uploading audio file:', file.name);
      try {
        const success = await loadCustomAudio(file);
        if (success) {
          setAudioSettings(prev => ({ ...prev, audioSource: 'custom' }));
          alert('✅ Audio file uploaded successfully!');
        }
      } catch (error) {
        console.error('❌ Error uploading audio file:', error);
        alert('❌ Failed to upload audio file. Please check file format and size.');
      }
    }
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
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="audioFileInput"
                  />
                  <button 
                    className="btn btn-secondary"
                    onClick={() => document.getElementById('audioFileInput').click()}
                  >
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
                  onChange={(e) => {
                    const newDuration = parseInt(e.target.value);
                    const newSettings = { ...audioSettings, playbackDuration: newDuration };
                    setAudioSettings(newSettings);
                    handleAutoSave(newSettings);
                  }}
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
                  onChange={(e) => {
                    const newVolume = parseInt(e.target.value);
                    const newSettings = { ...audioSettings, volume: newVolume };
                    setAudioSettings(newSettings);
                    handleAutoSave(newSettings);
                  }}
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
                  onChange={(e) => {
                    const newSettings = { ...audioSettings, loopAudio: e.target.checked };
                    setAudioSettings(newSettings);
                    handleAutoSave(newSettings);
                  }}
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

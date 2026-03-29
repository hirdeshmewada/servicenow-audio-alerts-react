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
  
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  
  const { getSettings, saveSettings } = useChromeStorage();

  useEffect(() => {
    loadSettings();
    checkUploadedFiles();
    
    // Set up storage listener for dynamic updates
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'sync' && changes.settings) {
        console.log('🔄 Sound settings changed in sync storage, updating UI...');
        loadSettings();
      }
      if (areaName === 'local' && changes.audioData) {
        console.log('🔄 Audio data changed in local storage, updating UI...');
        checkUploadedFiles();
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

  const checkUploadedFiles = async () => {
    try {
      const result = await chrome.storage.local.get(['audioData']);
      if (result.audioData) {
        setUploadedFile(result.audioData);
        console.log('📁 Found uploaded audio file:', result.audioData.name);
      } else {
        setUploadedFile(null);
      }
    } catch (error) {
      console.error('❌ Error checking uploaded files:', error);
    }
  };

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
    setUploadedFile(null);
    
    // Clear uploaded audio from storage
    chrome.storage.local.remove(['audioData']);
    console.log('🗑️ Custom audio removed and settings reset');
  };

  const handleClearCustomAudio = async () => {
    try {
      await chrome.storage.local.remove(['audioData']);
      setUploadedFile(null);
      const newSettings = { ...audioSettings, audioSource: 'default' };
      setAudioSettings(newSettings);
      await handleAutoSave(newSettings);
      console.log('🗑️ Custom audio cleared successfully');
      alert('✅ Custom audio removed successfully!');
    } catch (error) {
      console.error('❌ Error clearing custom audio:', error);
      alert('❌ Failed to remove custom audio');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    console.log('📁 File selected:', file);
    
    if (file) {
      console.log('📁 Uploading audio file:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      try {
        const success = await loadCustomAudio(file);
        console.log('📁 loadCustomAudio result:', success);
        
        if (success) {
          // Update audio source to custom
          const newSettings = { ...audioSettings, audioSource: 'custom' };
          setAudioSettings(newSettings);
          
          // Set uploaded file info
          setUploadedFile({
            name: file.name,
            type: file.type,
            size: file.size,
            loadedAt: new Date().toISOString()
          });
          
          // Auto-save the new settings
          await handleAutoSave(newSettings);
          
          console.log('✅ Audio file uploaded and settings updated!');
          alert('✅ Audio file uploaded successfully!');
        } else {
          throw new Error('loadCustomAudio returned false');
        }
      } catch (error) {
        console.error('❌ Error uploading audio file:', error);
        alert(`❌ Failed to upload audio file: ${error.message}`);
      }
    } else {
      console.warn('⚠️ No file selected');
    }
    
    // Reset file input
    event.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      console.log('📁 File dropped:', file);
      
      // Create a synthetic event to reuse the existing handler
      const syntheticEvent = {
        target: { files: [file] }
      };
      handleFileUpload(syntheticEvent);
    }
  };

  return (
    <div className="sound-page">
      <div className="page-header">
        <h2>Sound Settings</h2>
        <p>Configure audio notifications and custom sounds</p>
      </div>

      {/* Action Buttons at Top */}
      <div className="action-buttons">
        <button className="btn btn-secondary" onClick={handleReset}>
          🔄 Reset to Defaults
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          💾 Save Settings
        </button>
      </div>

      {/* 2x2 Grid Layout */}
      <div className="sound-grid">
        {/* Audio Selection - Top Left */}
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
              <div 
                className={`upload-area ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="upload-content">
                  <div className="upload-icon">{isDragging ? '📥' : '📁'}</div>
                  <h4>{isDragging ? 'Drop audio file here' : 'Upload Custom Audio'}</h4>
                  <p>Drag & drop MP3 or WAV files here (max 10MB)</p>
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
                  {uploadedFile ? (
                    <div className="uploaded-file-info">
                      <div className="file-details">
                        <div className="file-name">🎵 {uploadedFile.name}</div>
                        <div className="file-meta">
                          <span className="file-size">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                          <span className="file-type">{uploadedFile.type}</span>
                        </div>
                        <div className="file-date">
                          Uploaded: {new Date(uploadedFile.loadedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="file-actions">
                        <button className="btn btn-primary btn-sm" onClick={handleTestAudio}>
                          🔊 Test
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={handleReset}>
                          🗑️ Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">No custom audio files uploaded yet</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Playback Settings - Top Right */}
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

        {/* File Management - Bottom Left */}
        <div className="sound-section">
          <div className="section-title">File Management</div>
          <div className="files-management">
            <div className="files-grid">
              {uploadedFile ? (
                <div className="uploaded-file-info">
                  <div className="file-details">
                    <div className="file-name">🎵 {uploadedFile.name}</div>
                    <div className="file-meta">
                      <span className="file-size">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                      <span className="file-type">{uploadedFile.type}</span>
                    </div>
                    <div className="file-date">
                      Uploaded: {new Date(uploadedFile.loadedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="file-actions">
                    <button className="btn btn-primary btn-sm" onClick={handleTestAudio}>
                      🔊 Test
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={handleClearCustomAudio}>
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state">No files to manage</div>
              )}
            </div>
            <div className="storage-info">
              <div className="storage-stats">
                <div className="stat-item">
                  <span className="stat-label">Files Uploaded:</span>
                  <span>{uploadedFile ? '1' : '0'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Size:</span>
                  <span>{uploadedFile ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB` : '0 MB'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Max Files:</span>
                  <span>5</span>
                </div>
              </div>
              {uploadedFile && (
                <div className="storage-actions">
                  <button className="btn btn-secondary btn-sm" onClick={handleClearCustomAudio}>
                    🗑️ Clear All Files
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sound;

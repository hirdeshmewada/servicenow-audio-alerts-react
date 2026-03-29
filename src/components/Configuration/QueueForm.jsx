import React, { useState } from 'react';
import { validateServiceNowURL } from '../../services/servicenowAPI';
import './QueueForm.css';

const QueueForm = ({ queue, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: queue?.name || '',
    url: queue?.url || '',
    notificationText: queue?.notificationText || ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Queue name is required';
    }
    
    if (!formData.url.trim()) {
      newErrors.url = 'Queue URL is required';
    } else if (!validateServiceNowURL(formData.url)) {
      newErrors.url = 'Please enter a valid ServiceNow URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="queue-form">
      <h3>{queue ? 'Edit Queue' : 'Add New Queue'}</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">Queue Name</label>
          <input
            id="name"
            name="name"
            type="text"
            className={`form-control ${errors.name ? 'error' : ''}`}
            placeholder="e.g., High Priority Incidents"
            value={formData.name}
            onChange={handleChange}
          />
          {errors.name && <div className="error-text">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="url">Queue URL</label>
          <input
            id="url"
            name="url"
            type="text"
            className={`form-control ${errors.url ? 'error' : ''}`}
            placeholder="https://instance.service-now.com/incident_list.do?sysparm_query=..."
            value={formData.url}
            onChange={handleChange}
          />
          <div className="help-text">
            Paste a filtered list or report URL from ServiceNow
          </div>
          {errors.url && <div className="error-text">{errors.url}</div>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="notificationText">Notification Text</label>
          <input
            id="notificationText"
            name="notificationText"
            type="text"
            className="form-control"
            placeholder="New tickets in High Priority Incidents"
            value={formData.notificationText}
            onChange={handleChange}
          />
          <div className="help-text">
            Custom text for notifications from this queue
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {queue ? '💾 Update Queue' : '➕ Add Queue'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default QueueForm;

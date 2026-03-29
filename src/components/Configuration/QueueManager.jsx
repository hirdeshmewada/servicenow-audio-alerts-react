import React, { useState } from 'react';
import QueueCard from './QueueCard';
import QueueForm from './QueueForm';

const QueueManager = ({ queues, onQueuesChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingQueue, setEditingQueue] = useState(null);

  const handleAddQueue = (queueData) => {
    const newQueue = {
      id: Date.now().toString(),
      ...queueData,
      enabled: true,
      currentCount: 0,
      previousCount: 0
    };
    
    onQueuesChange([...queues, newQueue]);
    setShowAddForm(false);
  };

  const handleEditQueue = (queueId, queueData) => {
    const updatedQueues = queues.map(queue => 
      queue.id === queueId ? { ...queue, ...queueData } : queue
    );
    onQueuesChange(updatedQueues);
    setEditingQueue(null);
  };

  const handleDeleteQueue = (queueId) => {
    if (confirm('Are you sure you want to delete this queue?')) {
      onQueuesChange(queues.filter(queue => queue.id !== queueId));
    }
  };

  const handleToggleQueue = (queueId) => {
    const updatedQueues = queues.map(queue => 
      queue.id === queueId ? { ...queue, enabled: !queue.enabled } : queue
    );
    onQueuesChange(updatedQueues);
  };

  return (
    <div className="queue-manager">
      <div className="section-title">Queue Management</div>
      
      {showAddForm && (
        <QueueForm
          onSubmit={handleAddQueue}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingQueue && (
        <QueueForm
          queue={queues.find(q => q.id === editingQueue)}
          onSubmit={(data) => handleEditQueue(editingQueue, data)}
          onCancel={() => setEditingQueue(null)}
        />
      )}

      <div className="queue-list">
        {queues.map(queue => (
          <QueueCard
            key={queue.id}
            queue={queue}
            onEdit={() => setEditingQueue(queue.id)}
            onDelete={() => handleDeleteQueue(queue.id)}
            onToggle={() => handleToggleQueue(queue.id)}
          />
        ))}
        
        {queues.length === 0 && (
          <div className="empty-state">
            <p>No queues configured yet</p>
            <p>Add your first ServiceNow queue to start monitoring</p>
          </div>
        )}
      </div>

      {!showAddForm && !editingQueue && (
        <button 
          className="btn btn-secondary add-queue-btn"
          onClick={() => setShowAddForm(true)}
        >
          ➕ Add Queue
        </button>
      )}
    </div>
  );
};

export default QueueManager;

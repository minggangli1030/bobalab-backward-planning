// src/components/ProgressSummary.jsx - Updated with full task names
import React from 'react'
import './ProgressSummary.css'

export default function ProgressSummary({ completed }) {
  const total = 9
  const done = Object.keys(completed).length

  // Convert task IDs to full names
  const getFullTaskName = (taskId) => {
    const game = taskId[1];
    const taskNum = taskId[3];
    
    if (game === '1') return `Count ${taskNum}`;
    if (game === '2') return `Slide ${taskNum}`;
    if (game === '3') return `Type ${taskNum}`;
    return taskId; // fallback
  };

  return (
    <div className="progress-summary">
      <p>Completed {done} of {total} tasks</p>
      <ul>
        {Object.keys(completed).map(id => (
          <li key={id}>{getFullTaskName(id)} ✓</li>
        ))}
      </ul>
    </div>
  )
}
import React from 'react';
import GameTimer from './GameTimer';

export default function TaskRunnerLayout({
  currentTaskIndex,
  totalTasks,
  taskQueue,
  onSwitchTask,
  children,
  points,
  timeRemaining,
  onTimeUp
}) {
  const currentTaskType = taskQueue[currentTaskIndex];
  
  // Helper to get task name/icon
  const getTaskInfo = (type) => {
    if (type.startsWith('g1')) return { name: 'Research', icon: '📚', color: '#9C27B0' };
    if (type.startsWith('g2')) return { name: 'Materials', icon: '🎯', color: '#4CAF50' };
    if (type.startsWith('g3')) return { name: 'Engagement', icon: '✉️', color: '#f44336' };
    return { name: 'Unknown', icon: '❓', color: '#333' };
  };

  const currentInfo = getTaskInfo(currentTaskType);

  // Check availability for switching
  // We can only switch to a task type if it exists LATER in the queue
  const remainingQueue = taskQueue.slice(currentTaskIndex + 1);
  const hasTask2 = remainingQueue.some(t => t.startsWith('g1')); // Research
  const hasTask1 = remainingQueue.some(t => t.startsWith('g2')); // Materials
  const hasTask3 = remainingQueue.some(t => t.startsWith('g3')); // Engagement

  // Current task counts
  const completedCount = currentTaskIndex;
  
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'white',
        padding: '15px 25px',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        {/* Left: Timer */}
        <div style={{ width: '200px' }}>
           {/* Timer is now passed in or handled globally, but we can render a simple display here if GameTimer is fixed position. 
               Actually, the requirement said "Timer to the right (top?)". 
               Let's put it in the header for cleaner UI. 
               If GameTimer is fixed, we might need to adjust it or wrap it.
               For now, let's assume GameTimer handles its own rendering if we don't pass a container, 
               but here we want it integrated. 
               Let's render a custom timer display here using the prop.
           */}
           <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span style={{ fontSize: '24px' }}>⏱️</span>
             <div>
               <div style={{ 
                 fontSize: '24px', 
                 fontWeight: 'bold',
                 color: timeRemaining < 60 ? '#f44336' : '#333',
                 animation: timeRemaining < 60 ? 'pulse 1s infinite' : 'none'
               }}>
                 {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
               </div>
             </div>
           </div>
        </div>

        {/* Center: Points */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Points</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2196F3' }}>
            {points}
          </div>
        </div>

        {/* Right: Task Counter */}
        <div style={{ textAlign: 'right', width: '200px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Task Progress</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
            {completedCount} / {totalTasks}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        
        {/* Task Area */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          minHeight: '500px'
        }}>
          <div style={{ 
            marginBottom: '20px', 
            paddingBottom: '15px', 
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '24px' }}>{currentInfo.icon}</span>
            <h2 style={{ margin: 0, color: currentInfo.color }}>Current: {currentInfo.name}</h2>
          </div>
          
          {children}
        </div>

        {/* Sidebar: Switching Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', color: '#555' }}>Switch Task</h3>
            <p style={{ fontSize: '13px', color: '#777', marginBottom: '15px' }}>
              Pause current task and switch to another type. The current task will be moved to the end of the queue.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Switch to Materials (g2) */}
              <button
                disabled={!hasTask1 || currentTaskType.startsWith('g2')}
                onClick={() => onSwitchTask('g2')}
                style={switchButtonStyle(hasTask1 && !currentTaskType.startsWith('g2'), '#4CAF50')}
              >
                <span>🎯</span> Switch to Materials
              </button>

              {/* Switch to Research (g1) */}
              <button
                disabled={!hasTask2 || currentTaskType.startsWith('g1')}
                onClick={() => onSwitchTask('g1')}
                style={switchButtonStyle(hasTask2 && !currentTaskType.startsWith('g1'), '#9C27B0')}
              >
                <span>📚</span> Switch to Research
              </button>

              {/* Switch to Engagement (g3) */}
              <button
                disabled={!hasTask3 || currentTaskType.startsWith('g3')}
                onClick={() => onSwitchTask('g3')}
                style={switchButtonStyle(hasTask3 && !currentTaskType.startsWith('g3'), '#f44336')}
              >
                <span>✉️</span> Switch to Engagement
              </button>
            </div>
          </div>
          
          {/* Queue Preview (Optional, helpful for debugging/transparency) */}
          <div style={{ 
            background: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '12px',
            fontSize: '12px',
            color: '#666'
          }}>
            <strong>Next up:</strong>
            <div style={{ marginTop: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {remainingQueue.slice(0, 5).map((t, i) => (
                <span key={i} style={{ 
                  background: getTaskInfo(t).color, 
                  color: 'white', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  opacity: 0.7
                }}>
                  {getTaskInfo(t).icon}
                </span>
              ))}
              {remainingQueue.length > 5 && <span>+{remainingQueue.length - 5} more</span>}
            </div>
          </div>

        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const switchButtonStyle = (enabled, color) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px',
  border: `1px solid ${enabled ? color : '#ddd'}`,
  borderRadius: '8px',
  background: enabled ? 'white' : '#f5f5f5',
  color: enabled ? color : '#999',
  cursor: enabled ? 'pointer' : 'not-allowed',
  fontWeight: 'bold',
  transition: 'all 0.2s',
  opacity: enabled ? 1 : 0.7
});

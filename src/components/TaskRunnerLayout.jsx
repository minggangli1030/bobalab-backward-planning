import React from 'react';
import GameTimer from './GameTimer';

export default function TaskRunnerLayout({
  currentTaskIndex,
  totalTasks,
  taskQueue,
  onSwitchTask,
  onRefill,
  children,
  points,
  timeRemaining,
  onTimeUp,
  chatInterface
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

  // Calculate remaining counts per type
  const remainingCounts = {
    g1: taskQueue.filter(id => id.startsWith('g1')).length,
    g2: taskQueue.filter(id => id.startsWith('g2')).length,
    g3: taskQueue.filter(id => id.startsWith('g3')).length
  };

  const hasTask1 = remainingCounts.g1 > 0; // Research
  const hasTask2 = remainingCounts.g2 > 0; // Materials
  const hasTask3 = remainingCounts.g3 > 0; // Engagement
  
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
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
            {currentTaskIndex + 1} / {totalTasks}
          </div>
        </div>
      </div>

      {/* Main Content Area - 3 Column Grid */}
      <div className="task-runner-layout" style={{ 
        display: 'grid', 
        gridTemplateColumns: '250px 1fr 300px', 
        gap: '20px', 
        height: 'calc(100vh - 140px)', 
        boxSizing: 'border-box'
      }}>
        {/* Left Column: Task Switching & Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#666' }}>Task Jars</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Materials (g2) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <button
                      disabled={!hasTask2 || currentTaskType.startsWith('g2')}
                      onClick={() => onSwitchTask('g2')}
                      style={switchButtonStyle(hasTask2 && !currentTaskType.startsWith('g2'), '#4CAF50')}
                  >
                      <span>🎯</span> Materials ({remainingCounts.g2})
                  </button>
                  {!hasTask2 && (
                      <button onClick={() => onRefill && onRefill('g2')} style={refillButtonStyle}>
                          🔄 Refill Materials
                      </button>
                  )}
              </div>

              {/* Research (g1) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <button
                      disabled={!hasTask1 || currentTaskType.startsWith('g1')}
                      onClick={() => onSwitchTask('g1')}
                      style={switchButtonStyle(hasTask1 && !currentTaskType.startsWith('g1'), '#9C27B0')}
                  >
                      <span>📚</span> Research ({remainingCounts.g1})
                  </button>
                  {!hasTask1 && (
                      <button onClick={() => onRefill && onRefill('g1')} style={refillButtonStyle}>
                          🔄 Refill Research
                      </button>
                  )}
              </div>

              {/* Engagement (g3) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <button
                      disabled={!hasTask3 || currentTaskType.startsWith('g3')}
                      onClick={() => onSwitchTask('g3')}
                      style={switchButtonStyle(hasTask3 && !currentTaskType.startsWith('g3'), '#f44336')}
                  >
                      <span>✉️</span> Engagement ({remainingCounts.g3})
                  </button>
                  {!hasTask3 && (
                      <button onClick={() => onRefill && onRefill('g3')} style={refillButtonStyle}>
                          🔄 Refill Engagement
                      </button>
                  )}
              </div>
            </div>
          </div>
          
          {/* Queue Preview */}
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            flex: 1,
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#666' }}>Up Next</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {taskQueue.slice(currentTaskIndex + 1, currentTaskIndex + 6).map((taskId, idx) => {
                const info = getTaskInfo(taskId);
                return (
                  <div key={idx} style={{
                    padding: '10px',
                    background: '#f8f9fa',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${info.color}`,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>{info.icon}</span>
                    <span>{info.name}</span>
                  </div>
                );
              })}
              {taskQueue.length > currentTaskIndex + 6 && (
                <div style={{ textAlign: 'center', color: '#999', fontSize: '12px', marginTop: '5px' }}>
                  + {taskQueue.length - (currentTaskIndex + 6)} more
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Column: Task Content */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {children}
        </div>

        {/* Right Column: AI Chat Interface */}
        <div>
          {chatInterface && (
            <div style={{ 
              position: 'sticky',
              top: '20px'
            }}>
              {chatInterface}
            </div>
          )}
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

const refillButtonStyle = {
    padding: '8px',
    fontSize: '12px',
    background: '#eee',
    border: '1px dashed #999',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#333',
    marginTop: '5px'
};

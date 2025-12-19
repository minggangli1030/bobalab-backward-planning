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
  penalties = { switch: 0, refill: 0, unfinished: 0 },
  chatInterface
}) {
  const currentTaskType = taskQueue[currentTaskIndex];
  
  // Helper to get task name/icon
  const getTaskInfo = (type) => {
    if (type.startsWith('g1')) return { name: 'Research', icon: '📚', color: '#9C27B0', bg: '#f3e5f5' };
    if (type.startsWith('g2')) return { name: 'Materials', icon: '🎯', color: '#4CAF50', bg: '#e8f5e9' };
    if (type.startsWith('g3')) return { name: 'Engagement', icon: '✉️', color: '#f44336', bg: '#ffebee' };
    return { name: 'Unknown', icon: '❓', color: '#333', bg: '#eee' };
  };

  const currentInfo = getTaskInfo(currentTaskType);

  // Calculate Progress Stats
  const completedTasks = taskQueue.slice(0, currentTaskIndex);
  const doneCounts = {
    g1: completedTasks.filter(id => id.startsWith('g1')).length,
    g2: completedTasks.filter(id => id.startsWith('g2')).length,
    g3: completedTasks.filter(id => id.startsWith('g3')).length
  };
  const remainingCount = totalTasks - currentTaskIndex;

  // Get upcoming tasks for Jars (including current if applicable, but usually we want switch targets)
  // We want to show ALL tasks of each type that are AFTER the current index
  // actually, we want to show available switch targets.
  // The logic for "Jars" is:
  // 1. Filter queue from currentTaskIndex onwards (or just all remaining?)
  //    - Actually, we can only switch to the *next available* task of a different type.
  //    - But the user wants to see "Jars filled with tasks".
  //    - So let's show the queue separated by type.
  
  const upcomingQueue = taskQueue.slice(currentTaskIndex); // Includes current
  
  const jars = {
    g2: upcomingQueue.filter(id => id.startsWith('g2')), // Materials
    g1: upcomingQueue.filter(id => id.startsWith('g1')), // Research
    g3: upcomingQueue.filter(id => id.startsWith('g3'))  // Engagement
  };

  const isCurrent = (type) => currentTaskType.startsWith(type);

  const renderJar = (type, label, icon, color, bgColor, tasks) => {
    const count = tasks.length;
    const isActiveType = isCurrent(type);
    const hasTasks = count > 0;
    
    // If this is the active type, the top task is the one we are working on.
    // If it's not active, the top task is the switch target.
    
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        background: bgColor,
        borderRadius: '12px',
        padding: '10px',
        border: `2px solid ${isActiveType ? color : 'transparent'}`,
        height: '100%',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: color, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>{icon}</span>
          <span>{count}</span>
        </div>

        {/* Jar Content */}
        <div style={{ 
          flex: 1, 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '5px',
          justifyContent: 'flex-end', // Stack from bottom
          paddingBottom: '10px'
        }}>
          {hasTasks ? (
            <>
              {/* Stacked blocks for tasks */}
              {tasks.slice(1).map((t, i) => (
                 <div key={i} style={{
                   height: '8px',
                   width: '80%',
                   background: color,
                   opacity: 0.4,
                   borderRadius: '4px',
                   margin: '0 auto'
                 }} />
              ))}
              
              {/* Top Task (Button) */}
              <button
                onClick={() => !isActiveType && onSwitchTask(type)}
                disabled={isActiveType}
                style={{
                  width: '100%',
                  padding: '15px 5px',
                  background: isActiveType ? color : 'white',
                  color: isActiveType ? 'white' : color,
                  border: `2px solid ${color}`,
                  borderRadius: '8px',
                  cursor: isActiveType ? 'default' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  transition: 'transform 0.1s',
                  zIndex: 2
                }}
              >
                {isActiveType ? 'Current' : 'Switch'}
              </button>
            </>
          ) : (
            // Empty State - Refill Button
            <button 
              onClick={() => onRefill && onRefill(type)}
              style={{
                width: '100%',
                padding: '10px 5px',
                background: 'white',
                border: '2px dashed #999',
                borderRadius: '8px',
                color: '#666',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🔄 Refill
            </button>
          )}
        </div>
        
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>{label}</div>
      </div>
    );
  };
  
  return (
    <div style={{ maxWidth: '95vw', margin: '0 auto', padding: '20px' }}>
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
          {/* Penalties Display */}
          {(penalties.switch > 0 || penalties.refill > 0 || penalties.unfinished > 0) && (
            <div style={{ 
              marginTop: '8px', 
              fontSize: '11px', 
              color: '#f44336',
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              {penalties.switch > 0 && (
                <span title="Switch penalties">🔄 -{penalties.switch}</span>
              )}
              {penalties.refill > 0 && (
                <span title="Refill penalties">🔄 -{penalties.refill}</span>
              )}
              {penalties.unfinished > 0 && (
                <span title="Unfinished task penalties">⚠️ -{penalties.unfinished}</span>
              )}
            </div>
          )}
        </div>

        {/* Right: Detailed Task Progress */}
        <div style={{ textAlign: 'right', minWidth: '300px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Task Progress</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '15px' }}>
            {/* Done Counts */}
            <div style={{ display: 'flex', gap: '10px', fontSize: '16px', fontWeight: '500', color: '#555' }}>
              <span title="Materials Done">🎯 {doneCounts.g2}</span>
              <span style={{ color: '#ddd' }}>|</span>
              <span title="Research Done">📚 {doneCounts.g1}</span>
              <span style={{ color: '#ddd' }}>|</span>
              <span title="Engagement Done">✉️ {doneCounts.g3}</span>
            </div>
            
            {/* Remaining */}
            <div style={{ 
              background: '#eee', 
              padding: '4px 12px', 
              borderRadius: '20px', 
              fontSize: '14px', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              Remaining: {remainingCount}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - 3 Column Grid */}
      <div className="task-runner-layout" style={{ 
        display: 'grid', 
        gridTemplateColumns: '300px 1fr 340px', // Adjusted: Left 300px, Right 340px, Middle takes rest (wide)
        gap: '20px', 
        height: 'calc(100vh - 140px)', 
        boxSizing: 'border-box'
      }}>
        {/* Left Column: Task Jars */}
        <div style={{ 
          background: 'white', 
          padding: '15px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          height: 'fit-content', // Prevent stretching
          maxHeight: '100%'
        }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#666', textAlign: 'center' }}>Task Jars</h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '10px',
            flex: 1
          }}>
            {renderJar('g2', 'Materials', '🎯', '#4CAF50', '#e8f5e9', jars.g2)}
            {renderJar('g1', 'Research', '📚', '#9C27B0', '#f3e5f5', jars.g1)}
            {renderJar('g3', 'Engagement', '✉️', '#f44336', '#ffebee', jars.g3)}
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
        <div style={{
          height: '100%',
          overflow: 'hidden'
        }}>
          {chatInterface && (
            <div style={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
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

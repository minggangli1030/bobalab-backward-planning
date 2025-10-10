// src/components/NavTabs.jsx - Updated with proper unlocking logic
import React from 'react'

export default function NavTabs({ current, completed, onSwitch }) {
  const tabs = [
    ...[1,2,3].map(n=>({ id:`g1t${n}`, label:`Count ${n}` })),
    ...[1,2,3].map(n=>({ id:`g2t${n}`, label:`Slide ${n}` })),
    ...[1,2,3].map(n=>({ id:`g3t${n}`, label:`Type ${n}` }))
  ]

  // Task availability logic:
  // 1. First task of each game (g1t1, g2t1, g3t1) is always available
  // 2. Subsequent tasks within a game are only available after completing the previous task
  const isTaskAvailable = (tab) => {
    const game = tab.id[1];
    const taskNum = parseInt(tab.id[3]);
    
    // First task of each game is always available
    if (taskNum === 1) {
      return true;
    }
    
    // For other tasks, check if previous task in same game is completed
    const previousTask = `g${game}t${taskNum - 1}`;
    return completed[previousTask] === true;
  };

  return (
    <div className="nav-tabs">
      {tabs.map(tab => {
        const isAvailable = isTaskAvailable(tab);
        const isCompleted = completed[tab.id];
        
        return (
          <button
            key={tab.id}
            disabled={!isAvailable}
            className={current === tab.id ? 'active' : ''}
            onClick={() => isAvailable && onSwitch(tab.id)}
            style={{
              opacity: isAvailable ? 1 : 0.5,
              cursor: isAvailable ? 'pointer' : 'not-allowed'
            }}
          >
            {tab.label}{isCompleted && ' ✓'}
          </button>
        )
      })}
    </div>
  )
}
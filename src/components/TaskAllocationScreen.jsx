import React, { useState } from 'react';

export default function TaskAllocationScreen({ 
  onStart, 
  totalTasks = 10, 
  orderStrategy = "sequential",
  durationMinutes = 12
}) {
  const [allocation, setAllocation] = useState({
    g2: 0, // Materials (was slider)
    g1: 0, // Research (was counting)
    g3: 0, // Engagement (was typing)
  });
  
  const [aiChat, setAiChat] = useState([]);
  const [aiClickCount, setAiClickCount] = useState(0);
  const [error, setError] = useState(null);

  const aiResponses = [
    "It's generally smart to do roughly an even number of each task.",
    "This is because the tasks that are worth more points take more time to do, so you don't want to only do the shorter tasks or only do the longer tasks.",
    "Of course, you might prefer one task over another, so you could take that into account. Do you feel like you are particularly good at one of the tasks?"
  ];

  const handleAiHelp = () => {
    if (aiClickCount < aiResponses.length) {
      setAiChat(prev => [...prev, { 
        sender: 'AI', 
        text: aiResponses[aiClickCount] 
      }]);
      setAiClickCount(prev => prev + 1);
    } else {
        setAiChat(prev => [...prev, {
            sender: 'AI',
            text: "I've shared my best advice! It's up to you now."
        }]);
    }
  };

  const handleCountChange = (taskKey, value) => {
    const num = parseInt(value) || 0;
    setAllocation(prev => ({
      ...prev,
      [taskKey]: Math.max(0, num)
    }));
    setError(null);
  };

  const currentTotal = Object.values(allocation).reduce((a, b) => a + b, 0);
  const isValid = currentTotal === totalTasks;

  const handleStart = () => {
    if (currentTotal !== totalTasks) {
      setError(`Total tasks must equal ${totalTasks}. Currently: ${currentTotal}`);
      return;
    }

    // Generate task queue
    let queue = [];
    
    if (orderStrategy === "random") {
      // Create pool and shuffle
      const pool = [
        ...Array(allocation.g2).fill('g2'),
        ...Array(allocation.g1).fill('g1'),
        ...Array(allocation.g3).fill('g3')
      ];
      // Fisher-Yates shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      // Assign levels
      const counts = { g1: 0, g2: 0, g3: 0 };
      queue = pool.map(type => {
        counts[type]++;
        return `${type}t${counts[type]}`;
      });
    } else {
      // Sequential: Materials (g2) -> Research (g1) -> Engagement (g3)
      for (let i = 0; i < allocation.g2; i++) queue.push(`g2t${i + 1}`);
      for (let i = 0; i < allocation.g1; i++) queue.push(`g1t${i + 1}`);
      for (let i = 0; i < allocation.g3; i++) queue.push(`g3t${i + 1}`);
    }

    onStart(queue, allocation);
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '40px auto', 
      padding: '30px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
        Task Allocation Strategy
      </h1>

      <div style={{ marginBottom: '30px', lineHeight: '1.6', color: '#555' }}>
        <p>You have <strong>{durationMinutes} minutes</strong> to complete <strong>{totalTasks} tasks</strong>.</p>
        <p>You must decide now how many of each task type you want to perform.</p>
        <p>Total tasks must add up to <strong>{totalTasks}</strong>.</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '40px',
        marginBottom: '40px'
      }}>
        {/* Left Col: Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={inputRowStyle}>
            <label style={labelStyle}>
              <span style={{fontSize: '24px', marginRight: '10px'}}>🎯</span>
              Task 1: Slider (Materials)
            </label>
            <input 
              type="number" 
              min="0" 
              max={totalTasks}
              value={allocation.g2}
              onChange={(e) => handleCountChange('g2', e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={inputRowStyle}>
            <label style={labelStyle}>
              <span style={{fontSize: '24px', marginRight: '10px'}}>📚</span>
              Task 2: Counting (Research)
            </label>
            <input 
              type="number" 
              min="0" 
              max={totalTasks}
              value={allocation.g1}
              onChange={(e) => handleCountChange('g1', e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={inputRowStyle}>
            <label style={labelStyle}>
              <span style={{fontSize: '24px', marginRight: '10px'}}>✉️</span>
              Task 3: Typing (Engagement)
            </label>
            <input 
              type="number" 
              min="0" 
              max={totalTasks}
              value={allocation.g3}
              onChange={(e) => handleCountChange('g3', e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: isValid ? '#e8f5e9' : '#ffebee',
            borderRadius: '8px',
            textAlign: 'center',
            fontWeight: 'bold',
            color: isValid ? '#2e7d32' : '#c62828'
          }}>
            Total Allocated: {currentTotal} / {totalTasks}
          </div>
          
          {error && (
            <div style={{ color: 'red', textAlign: 'center', fontSize: '14px' }}>
              {error}
            </div>
          )}
        </div>

        {/* Right Col: AI Help */}
        <div style={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            flex: 1, 
            marginBottom: '15px', 
            overflowY: 'auto', 
            maxHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {aiChat.length === 0 && (
              <div style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: '40px' }}>
                Need advice? Ask the AI helper.
              </div>
            )}
            {aiChat.map((msg, i) => (
              <div key={i} style={{ 
                background: '#f0f7ff', 
                padding: '10px 15px', 
                borderRadius: '12px 12px 12px 0',
                alignSelf: 'flex-start',
                maxWidth: '90%'
              }}>
                <strong>🤖 AI:</strong> {msg.text}
              </div>
            ))}
          </div>
          
          <button 
            onClick={handleAiHelp}
            style={{
              background: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>🤖</span> Ask AI for Recommendation
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={handleStart}
          disabled={!isValid}
          style={{
            background: isValid ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            padding: '15px 40px',
            fontSize: '18px',
            borderRadius: '30px',
            cursor: isValid ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            boxShadow: isValid ? '0 4px 15px rgba(76, 175, 80, 0.3)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          Start Experiment
        </button>
      </div>
    </div>
  );
}

const inputRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: '#f9f9f9',
  padding: '15px',
  borderRadius: '8px'
};

const labelStyle = {
  fontWeight: 'bold',
  color: '#333',
  display: 'flex',
  alignItems: 'center'
};

const inputStyle = {
  width: '60px',
  padding: '10px',
  fontSize: '18px',
  textAlign: 'center',
  borderRadius: '6px',
  border: '1px solid #ddd'
};

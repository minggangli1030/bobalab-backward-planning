import React, { useState } from 'react';

export default function TaskAllocationScreen({ onStart }) {
  const [counts, setCounts] = useState({
    task1: 0, // Slider (Materials)
    task2: 0, // Counting (Research)
    task3: 0  // Typing (Engagement)
  });
  
  const [aiChat, setAiChat] = useState([]);
  const [aiClickCount, setAiClickCount] = useState(0);

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
        // Optional: Loop or generic message if they keep clicking
        setAiChat(prev => [...prev, {
            sender: 'AI',
            text: "I've shared my best advice! It's up to you now."
        }]);
    }
  };

  const handleCountChange = (task, value) => {
    const num = parseInt(value) || 0;
    setCounts(prev => ({
      ...prev,
      [task]: Math.max(0, num)
    }));
  };

  const totalTasks = counts.task1 + counts.task2 + counts.task3;
  const isValid = totalTasks === 10;

  const handleStart = () => {
    if (!isValid) return;
    
    // Generate queue
    // Order: We need to decide a default order. 
    // The prompt says: "If the person puts in Task 1 = 2 times, Task 2 = 3 times, and Task 3 = 5 times, then the system will navigate through the tasks exactly in this sequence."
    // Implication: T1s first, then T2s, then T3s.
    
    const queue = [];
    for (let i = 0; i < counts.task1; i++) queue.push('g2'); // Materials/Slider
    for (let i = 0; i < counts.task2; i++) queue.push('g1'); // Research/Counting
    for (let i = 0; i < counts.task3; i++) queue.push('g3'); // Engagement/Typing
    
    // Note: Mapping based on App.jsx logic:
    // g1 = Research (Counting)
    // g2 = Materials (Slider)
    // g3 = Engagement (Typing)
    // Wait, prompt says "Task 1 (slider task)". 
    // In App.jsx: 
    // g2t1 -> Materials (was slider)
    // g1t1 -> Research (was counting)
    // g3t1 -> Engagement (was typing)
    
    // So Task 1 = Slider = g2
    // Task 2 = Counting = g1 (Assuming standard order, but let's verify mapping in UI)
    // Task 3 = Typing = g3
    
    onStart(queue, counts);
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
        <p>You have <strong>12 minutes</strong> to complete <strong>10 tasks</strong>.</p>
        <p>You must decide now how many of each task type you want to perform.</p>
        <p>Total tasks must add up to <strong>10</strong>.</p>
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
              max="10"
              value={counts.task1}
              onChange={(e) => handleCountChange('task1', e.target.value)}
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
              max="10"
              value={counts.task2}
              onChange={(e) => handleCountChange('task2', e.target.value)}
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
              max="10"
              value={counts.task3}
              onChange={(e) => handleCountChange('task3', e.target.value)}
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
            Total Allocated: {totalTasks} / 10
          </div>
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

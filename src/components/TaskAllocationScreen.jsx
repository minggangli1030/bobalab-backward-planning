import React, { useState, useEffect } from 'react';

export default function TaskAllocationScreen({ 
  onStart, 
  totalTasks = 10, 
  orderStrategy = "sequential_task",
  durationMinutes = 12,
  difficultyMode = "fixed" // 'fixed' or 'manual'
}) {
  // State for Fixed Mode (Simple counts)
  const [simpleAllocation, setSimpleAllocation] = useState({
    g2: 0, // Materials
    g1: 0, // Research
    g3: 0, // Engagement
  });

  // State for Manual Mode (Detailed counts)
  const [manualAllocation, setManualAllocation] = useState({
    g2: { easy: 0, medium: 0, hard: 0 },
    g1: { easy: 0, medium: 0, hard: 0 },
    g3: { easy: 0, medium: 0, hard: 0 }
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

  // Handle Simple Allocation Change
  const handleSimpleChange = (taskKey, value) => {
    const num = parseInt(value) || 0;
    setSimpleAllocation(prev => ({
      ...prev,
      [taskKey]: Math.max(0, num)
    }));
    setError(null);
  };

  // Handle Manual Allocation Change
  const handleManualChange = (taskKey, difficulty, value) => {
    const num = parseInt(value) || 0;
    setManualAllocation(prev => ({
      ...prev,
      [taskKey]: {
        ...prev[taskKey],
        [difficulty]: Math.max(0, num)
      }
    }));
    setError(null);
  };

  // Calculate Totals
  const getSimpleTotal = () => Object.values(simpleAllocation).reduce((a, b) => a + b, 0);
  
  const getManualTotal = () => {
    let total = 0;
    Object.values(manualAllocation).forEach(task => {
      total += task.easy + task.medium + task.hard;
    });
    return total;
  };

  const currentTotal = difficultyMode === 'manual' ? getManualTotal() : getSimpleTotal();
  const isValid = currentTotal === totalTasks;

  const handleStart = () => {
    if (currentTotal !== totalTasks) {
      setError(`Total tasks must equal ${totalTasks}. Currently: ${currentTotal}`);
      return;
    }

    let finalAllocation = []; // Array of { type: 'g2', difficulty: 'easy' } objects

    if (difficultyMode === 'fixed') {
      // Distribute 50/30/20 for each task type
      ['g2', 'g1', 'g3'].forEach(type => {
        const count = simpleAllocation[type];
        if (count > 0) {
          const easyCount = Math.round(count * 0.5);
          const mediumCount = Math.round(count * 0.3);
          const hardCount = count - easyCount - mediumCount;
          
          // Handle potential negative hard count due to rounding
          // (e.g. count=1 -> 1, 0, 0)
          // Adjust logic to ensure sum equals count
          
          // Better distribution logic:
          // Fill Easy, then Medium, then Hard
          let remaining = count;
          const e = Math.ceil(count * 0.5); // Prioritize easy? Or round?
          // Let's stick to strict rounding but adjust last bucket
          // Actually, for small numbers, 50/30/20 is tricky.
          // Let's use:
          // Easy: round(0.5 * N)
          // Medium: round(0.3 * N)
          // Hard: Remainder
          
          const finalEasy = Math.max(0, Math.round(count * 0.5));
          const finalMedium = Math.max(0, Math.round(count * 0.3));
          const finalHard = Math.max(0, count - finalEasy - finalMedium);
          
          // Re-adjust if sum != count (should be handled by remainder logic, but just in case)
          // Actually, hard could be negative if easy+medium > count.
          // Example: count=1. Easy=1, Med=0, Hard=0. Correct.
          // Example: count=2. Easy=1, Med=1, Hard=0. Correct.
          // Example: count=3. Easy=2, Med=1, Hard=0. Correct.
          
          for(let i=0; i<finalEasy; i++) finalAllocation.push({ type, difficulty: 'easy' });
          for(let i=0; i<finalMedium; i++) finalAllocation.push({ type, difficulty: 'medium' });
          for(let i=0; i<finalHard; i++) finalAllocation.push({ type, difficulty: 'hard' });
        }
      });
    } else {
      // Manual Mode
      ['g2', 'g1', 'g3'].forEach(type => {
        const { easy, medium, hard } = manualAllocation[type];
        for(let i=0; i<easy; i++) finalAllocation.push({ type, difficulty: 'easy' });
        for(let i=0; i<medium; i++) finalAllocation.push({ type, difficulty: 'medium' });
        for(let i=0; i<hard; i++) finalAllocation.push({ type, difficulty: 'hard' });
      });
    }

    // Generate Queue IDs based on difficulty mapping
    // Easy: 1-5, Medium: 6-10, Hard: 11+
    // We need to track used indices for each type/difficulty combo to ensure uniqueness if possible
    // But actually, we just need to assign valid IDs.
    // Let's assume we cycle through available IDs for that difficulty.
    
    const counters = {
      g2: { easy: 1, medium: 6, hard: 11 },
      g1: { easy: 1, medium: 6, hard: 11 },
      g3: { easy: 1, medium: 6, hard: 11 }
    };

    const queueItems = finalAllocation.map(item => {
      const { type, difficulty } = item;
      const id = counters[type][difficulty]++;
      return { ...item, id: `${type}t${id}` };
    });

    // Sort Queue based on Strategy
    let sortedQueue = [];
    
    if (orderStrategy === 'sequential_difficulty') {
      // Easy -> Medium -> Hard
      // Within difficulty: Materials -> Research -> Engagement
      const priority = { easy: 1, medium: 2, hard: 3 };
      const typePriority = { g2: 1, g1: 2, g3: 3 };
      
      sortedQueue = queueItems.sort((a, b) => {
        if (priority[a.difficulty] !== priority[b.difficulty]) {
          return priority[a.difficulty] - priority[b.difficulty];
        }
        return typePriority[a.type] - typePriority[b.type];
      });
    } else {
      // sequential_task (Default)
      // Materials -> Research -> Engagement
      // Within type: Easy -> Medium -> Hard
      const typePriority = { g2: 1, g1: 2, g3: 3 };
      const diffPriority = { easy: 1, medium: 2, hard: 3 };
      
      sortedQueue = queueItems.sort((a, b) => {
        if (typePriority[a.type] !== typePriority[b.type]) {
          return typePriority[a.type] - typePriority[b.type];
        }
        return diffPriority[a.difficulty] - diffPriority[b.difficulty];
      });
    }

    const queueIds = sortedQueue.map(item => item.id);
    
    // Pass simple allocation for stats tracking if in manual mode?
    // Or construct a summary object.
    const summaryAllocation = difficultyMode === 'fixed' ? simpleAllocation : {
      g2: manualAllocation.g2.easy + manualAllocation.g2.medium + manualAllocation.g2.hard,
      g1: manualAllocation.g1.easy + manualAllocation.g1.medium + manualAllocation.g1.hard,
      g3: manualAllocation.g3.easy + manualAllocation.g3.medium + manualAllocation.g3.hard,
    };

    onStart(queueIds, summaryAllocation);
  };

  return (
    <div style={{ 
      maxWidth: '900px', 
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
        {difficultyMode === 'fixed' && (
          <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#666' }}>
            * Within each task type, tasks are distributed as 50% Easy, 30% Medium, 20% Hard.
          </p>
        )}
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr', 
        gap: '40px',
        marginBottom: '40px'
      }}>
        {/* Left Col: Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {difficultyMode === 'fixed' ? (
            // FIXED MODE INPUTS
            <>
              <div style={inputRowStyle}>
                <label style={labelStyle}>
                  <span style={{fontSize: '24px', marginRight: '10px'}}>🎯</span>
                  Task 1: Slider (Materials)
                </label>
                <input 
                  type="number" 
                  min="0" 
                  max={totalTasks}
                  value={simpleAllocation.g2}
                  onChange={(e) => handleSimpleChange('g2', e.target.value)}
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
                  value={simpleAllocation.g1}
                  onChange={(e) => handleSimpleChange('g1', e.target.value)}
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
                  value={simpleAllocation.g3}
                  onChange={(e) => handleSimpleChange('g3', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </>
          ) : (
            // MANUAL MODE INPUTS (9 Jars)
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Materials */}
              <div style={manualGroupStyle}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{fontSize: '20px', marginRight: '10px'}}>🎯</span> Materials (Slider)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <ManualInput label="Easy" value={manualAllocation.g2.easy} onChange={(v) => handleManualChange('g2', 'easy', v)} />
                  <ManualInput label="Medium" value={manualAllocation.g2.medium} onChange={(v) => handleManualChange('g2', 'medium', v)} />
                  <ManualInput label="Hard" value={manualAllocation.g2.hard} onChange={(v) => handleManualChange('g2', 'hard', v)} />
                </div>
              </div>

              {/* Research */}
              <div style={manualGroupStyle}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{fontSize: '20px', marginRight: '10px'}}>📚</span> Research (Counting)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <ManualInput label="Easy" value={manualAllocation.g1.easy} onChange={(v) => handleManualChange('g1', 'easy', v)} />
                  <ManualInput label="Medium" value={manualAllocation.g1.medium} onChange={(v) => handleManualChange('g1', 'medium', v)} />
                  <ManualInput label="Hard" value={manualAllocation.g1.hard} onChange={(v) => handleManualChange('g1', 'hard', v)} />
                </div>
              </div>

              {/* Engagement */}
              <div style={manualGroupStyle}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{fontSize: '20px', marginRight: '10px'}}>✉️</span> Engagement (Typing)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <ManualInput label="Easy" value={manualAllocation.g3.easy} onChange={(v) => handleManualChange('g3', 'easy', v)} />
                  <ManualInput label="Medium" value={manualAllocation.g3.medium} onChange={(v) => handleManualChange('g3', 'medium', v)} />
                  <ManualInput label="Hard" value={manualAllocation.g3.hard} onChange={(v) => handleManualChange('g3', 'hard', v)} />
                </div>
              </div>
            </div>
          )}

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

// Helper Component for Manual Input
const ManualInput = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <label style={{ fontSize: '12px', marginBottom: '4px', color: '#666' }}>{label}</label>
    <input 
      type="number" 
      min="0" 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '50px',
        padding: '8px',
        textAlign: 'center',
        border: '1px solid #ddd',
        borderRadius: '4px'
      }}
    />
  </div>
);

const inputRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: '#f9f9f9',
  padding: '15px',
  borderRadius: '8px'
};

const manualGroupStyle = {
  background: '#f9f9f9',
  padding: '15px',
  borderRadius: '8px',
  border: '1px solid #eee'
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

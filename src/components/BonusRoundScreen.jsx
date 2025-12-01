import React from 'react';

export default function BonusRoundScreen({ 
  timeRemaining, 
  onSelectTask, 
  onFinishEarly 
}) {
  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '40px auto', 
      padding: '40px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      textAlign: 'center'
    }}>
      <h1 style={{ color: '#2196F3', marginBottom: '20px' }}>🎉 All Tasks Completed!</h1>
      
      <div style={{ fontSize: '18px', color: '#555', marginBottom: '30px', lineHeight: '1.6' }}>
        <p>You have finished all 10 allocated tasks with time to spare.</p>
        <p>You currently have <strong>{Math.floor(timeRemaining / 60)} minutes and {timeRemaining % 60} seconds</strong> remaining.</p>
        <p>You can choose to do more tasks for <strong>1/2 credit</strong> to increase your score, or finish the experiment now.</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '20px',
        marginBottom: '40px'
      }}>
        <button 
          onClick={() => onSelectTask('g2')}
          style={bonusButtonStyle('#4CAF50')}
        >
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>🎯</span>
          Do Materials Task
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>(50% Points)</div>
        </button>

        <button 
          onClick={() => onSelectTask('g1')}
          style={bonusButtonStyle('#9C27B0')}
        >
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>📚</span>
          Do Research Task
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>(50% Points)</div>
        </button>

        <button 
          onClick={() => onSelectTask('g3')}
          style={bonusButtonStyle('#f44336')}
        >
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>✉️</span>
          Do Engagement Task
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>(50% Points)</div>
        </button>
      </div>

      <div style={{ borderTop: '1px solid #eee', paddingTop: '30px' }}>
        <button 
          onClick={onFinishEarly}
          style={{
            background: '#f5f5f5',
            color: '#666',
            border: '1px solid #ddd',
            padding: '12px 30px',
            fontSize: '16px',
            borderRadius: '30px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.target.style.background = '#e0e0e0'}
          onMouseLeave={e => e.target.style.background = '#f5f5f5'}
        >
          No thanks, I'm done
        </button>
      </div>
    </div>
  );
}

const bonusButtonStyle = (color) => ({
  background: 'white',
  border: `2px solid ${color}`,
  color: color,
  padding: '20px',
  borderRadius: '12px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 'bold',
  transition: 'all 0.2s',
  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
});

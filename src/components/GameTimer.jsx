import React, { useEffect, useState } from 'react';

export default function GameTimer({ 
  duration = 900, // 15 minutes in seconds
  onTimeUp, 
  isPaused = false 
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        
        // Set warning states
        if (prev <= 60 && !isCritical) {
          setIsCritical(true);
        } else if (prev <= 180 && !isWarning) {
          setIsWarning(true);
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, onTimeUp, isWarning, isCritical]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (isCritical) return '#f44336';
    if (isWarning) return '#ff9800';
    return '#2196F3';
  };

  const getProgressPercentage = () => {
    return (timeLeft / duration) * 100;
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'white',
      padding: '15px 25px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      border: `3px solid ${getTimerColor()}`,
      zIndex: 1000,
      minWidth: '200px',
      transition: 'all 0.3s'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '12px', 
          color: '#666', 
          marginBottom: '5px',
          fontWeight: 'bold'
        }}>
          TIME REMAINING
        </div>
        
        <div style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: getTimerColor(),
          fontFamily: 'monospace',
          animation: isCritical ? 'pulse 1s infinite' : 'none'
        }}>
          {formatTime(timeLeft)}
        </div>
        
        {/* Progress bar */}
        <div style={{
          width: '100%',
          height: '6px',
          background: '#e0e0e0',
          borderRadius: '3px',
          marginTop: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${getProgressPercentage()}%`,
            height: '100%',
            background: getTimerColor(),
            transition: 'width 1s linear, background 0.3s',
            borderRadius: '3px'
          }} />
        </div>
        
        {/* Warning messages */}
        {isCritical && (
          <div style={{
            fontSize: '12px',
            color: '#f44336',
            marginTop: '8px',
            fontWeight: 'bold',
            animation: 'blink 1s infinite'
          }}>
            ⚠️ FINAL MINUTE!
          </div>
        )}
        {isWarning && !isCritical && (
          <div style={{
            fontSize: '12px',
            color: '#ff9800',
            marginTop: '8px'
          }}>
            ⏰ 3 minutes left
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        @keyframes blink {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
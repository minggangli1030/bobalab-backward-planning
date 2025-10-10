// src/components/PracticeMode.jsx - Fixed with proper navigation
import React, { useState } from "react";
import CountingTask from "./CountingTask";
import SliderTask from "./SliderTask";
import TypingTask from "./TypingTask";
import "./PracticeMode.css";

export default function PracticeMode({
  practiceCompleted = {},
  onPracticeComplete,
  onStartMainGame,
  onSelectPractice,
  isAdmin = false,
}) {
  const [currentPractice, setCurrentPractice] = useState(null);

  const handlePracticeTaskComplete = (taskId, data) => {

    // Check if perfect accuracy (2 points)
    if (data && data.points === 2) {
      // Mark as complete - pass the data object too
      if (typeof onPracticeComplete === "function") {
        onPracticeComplete(taskId, data);
      }

      // Show success message
      const notification = document.createElement("div");
      notification.className = "notification-enter";
      notification.style.cssText =
        "position: fixed; bottom: 20px; left: 20px; background: #4CAF50; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000; max-width: 400px;";
      notification.textContent =
        "Perfect! Practice task completed. Returning to menu...";
      document.body.appendChild(notification);

      // Auto-return to menu after completion
      setTimeout(() => {
        setCurrentPractice(null);
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 1500);
    } else {
      // Show retry message
      const points = data?.points || 0;
      const notification = document.createElement("div");
      notification.className = "notification-enter";
      notification.style.cssText =
        "position: fixed; bottom: 20px; left: 20px; background: #ff9800; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000; max-width: 400px;";
      notification.textContent = `Practice requires 100% accuracy. You scored ${
        points === 1 ? "50%" : "0%"
      }. Try again!`;
      document.body.appendChild(notification);

      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
    }
  };

  const allComplete =
    practiceCompleted.g2t1 && practiceCompleted.g1t1 && practiceCompleted.g3t1;

  const renderPracticeMenu = () => (
    <div className="practice-menu">
      <h2>Practice Mode {!isAdmin && "(Required)"}</h2>

      {/* Combined warning box at the top */}
      {!isAdmin && (
        <div
          style={{
            background: "linear-gradient(135deg, #fff3cd 0%, #ffebee 100%)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "25px",
            border: "2px solid #f57c00",
            boxShadow: "0 4px 6px rgba(245, 124, 0, 0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "20px" }}>⚠️</span>
            <strong style={{ color: "#e65100", fontSize: "18px" }}>
              100% PERFECT ACCURACY REQUIRED
            </strong>
          </div>
          <div style={{ color: "#e65100", fontSize: "14px" }}>
            You must score 2/2 points (exact answer) on all three practice tasks
            to proceed.
            <br />
            <strong>No partial credit in practice mode!</strong>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              marginTop: "12px",
            }}
          >
            <span
              style={{
                padding: "4px 12px",
                background: practiceCompleted.g2t1 ? "#e8f5e9" : "white",
                borderRadius: "20px",
                fontSize: "13px",
                color: practiceCompleted.g2t1 ? "#4CAF50" : "#f57c00",
                fontWeight: "600",
                border: `1px solid ${
                  practiceCompleted.g2t1 ? "#4CAF50" : "#ffb74d"
                }`,
              }}
            >
              Materials {practiceCompleted.g2t1 ? "✓" : "Required"}
            </span>

            <span
              style={{
                padding: "4px 12px",
                background: practiceCompleted.g1t1 ? "#e8f5e9" : "white",
                borderRadius: "20px",
                fontSize: "13px",
                color: practiceCompleted.g1t1 ? "#4CAF50" : "#f57c00",
                fontWeight: "600",
                border: `1px solid ${
                  practiceCompleted.g1t1 ? "#4CAF50" : "#ffb74d"
                }`,
              }}
            >
              Research {practiceCompleted.g1t1 ? "✓" : "Required"}
            </span>

            <span
              style={{
                padding: "4px 12px",
                background: practiceCompleted.g3t1 ? "#e8f5e9" : "white",
                borderRadius: "20px",
                fontSize: "13px",
                color: practiceCompleted.g3t1 ? "#4CAF50" : "#f57c00",
                fontWeight: "600",
                border: `1px solid ${
                  practiceCompleted.g3t1 ? "#4CAF50" : "#ffb74d"
                }`,
              }}
            >
              Engagement {practiceCompleted.g3t1 ? "✓" : "Required"}
            </span>
          </div>
        </div>
      )}

      <p
        className="practice-hint"
        style={{
          textAlign: "center",
          fontSize: "16px",
          color: "#666",
          marginBottom: "30px",
        }}
      >
        Try each task type before starting the main challenge. No time pressure!
      </p>

      <div className="practice-cards">
        {/* Materials first (was Slider) */}
        <div className="practice-card materials">
          <h3>🎯 Materials</h3>
          <p>Hold and drag slider to match target values</p>
          <p style={{ fontSize: "13px", color: "#666", marginTop: "10px" }}>
            Base points - directly added to score
          </p>
          <div className="practice-buttons">
            <button
              onClick={() => {
                setCurrentPractice("g2t1");
                // Also call onSelectPractice if it exists (for compatibility)
                if (onSelectPractice) {
                  onSelectPractice("g2t1");
                }
              }}
              className={practiceCompleted.g2t1 ? "completed" : ""}
              disabled={false}
            >
              {practiceCompleted.g2t1 ? "✓ Completed" : "Try Materials"}
            </button>
          </div>
        </div>

        {/* Research second (was Counting) */}
        <div className="practice-card research">
          <h3>📚 Research</h3>
          <p>Count words or letters in text passages</p>
          <p style={{ fontSize: "13px", color: "#666", marginTop: "10px" }}>
            Worth 15% multiplier per point in main game
          </p>
          <div className="practice-buttons">
            <button
              onClick={() => {
                setCurrentPractice("g1t1");
                // Also call onSelectPractice if it exists
                if (onSelectPractice) {
                  onSelectPractice("g1t1");
                }
              }}
              className={practiceCompleted.g1t1 ? "completed" : ""}
              disabled={false}
            >
              {practiceCompleted.g1t1 ? "✓ Completed" : "Try Research"}
            </button>
          </div>
        </div>

        {/* Engagement third (was Typing) */}
        <div className="practice-card engagement">
          <h3>✉️ Engagement</h3>
          <p>Type patterns exactly as shown</p>
          <p style={{ fontSize: "13px", color: "#666", marginTop: "10px" }}>
            Worth 0.15% compound interest per point
          </p>
          <div className="practice-buttons">
            <button
              onClick={() => {
                setCurrentPractice("g3t1");
                // Also call onSelectPractice if it exists
                if (onSelectPractice) {
                  onSelectPractice("g3t1");
                }
              }}
              className={practiceCompleted.g3t1 ? "completed" : ""}
              disabled={false}
            >
              {practiceCompleted.g3t1 ? "✓ Completed" : "Try Engagement"}
            </button>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div
        style={{
          marginTop: "25px",
          padding: "15px",
          background: "#f5f5f5",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "16px" }}>
          Practice Progress:
        </h4>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <div
            style={{
              padding: "8px 15px",
              background: practiceCompleted.g2t1 ? "#4CAF50" : "#e0e0e0",
              color: practiceCompleted.g2t1 ? "white" : "#666",
              borderRadius: "20px",
              fontSize: "14px",
            }}
          >
            Materials {practiceCompleted.g2t1 && "✓"}
          </div>
          <div
            style={{
              padding: "8px 15px",
              background: practiceCompleted.g1t1 ? "#9C27B0" : "#e0e0e0",
              color: practiceCompleted.g1t1 ? "white" : "#666",
              borderRadius: "20px",
              fontSize: "14px",
            }}
          >
            Research {practiceCompleted.g1t1 && "✓"}
          </div>
          <div
            style={{
              padding: "8px 15px",
              background: practiceCompleted.g3t1 ? "#f44336" : "#e0e0e0",
              color: practiceCompleted.g3t1 ? "white" : "#666",
              borderRadius: "20px",
              fontSize: "14px",
            }}
          >
            Engagement {practiceCompleted.g3t1 && "✓"}
          </div>
        </div>

        <div style={{ marginTop: "12px", fontSize: "13px", color: "#666" }}>
          <strong>100% accuracy required</strong> to complete each practice task
        </div>
      </div>

      {/* Start button */}
      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <button
          className="start-main-game-btn"
          onClick={onStartMainGame}
          style={{
            opacity: !isAdmin && !allComplete ? 0.5 : 1,
            cursor: !isAdmin && !allComplete ? "not-allowed" : "pointer",
          }}
          disabled={!isAdmin && !allComplete}
        >
          {isAdmin
            ? "Start Main Game (Admin)"
            : allComplete
            ? "Start Main Game - You're Ready! 🚀"
            : "Complete Practice First"}
        </button>
      </div>
    </div>
  );

  if (!currentPractice) {
    return renderPracticeMenu();
  }

  const game = currentPractice[1];
  const taskNum = 1; // Always use task 1 for practice

  return (
    <div className="practice-container">
      <button className="back-to-menu" onClick={() => setCurrentPractice(null)}>
        ← Back to Practice Menu
      </button>

      <div
        style={{
          textAlign: "center",
          padding: "10px",
          background: "#fff3cd",
          borderRadius: "6px",
          margin: "10px 0",
          fontSize: "14px",
          color: "#856404",
        }}
      >
        <strong>Practice Mode:</strong> 100% accuracy required. Will auto-return
        after completion.
      </div>

      <div className="practice-task-wrapper">
        {game === "1" && (
          <CountingTask
            taskNum={taskNum}
            onComplete={handlePracticeTaskComplete}
            isPractice={true}
            currentTaskId={currentPractice}
          />
        )}

        {game === "2" && (
          <SliderTask
            taskNum={taskNum}
            onComplete={handlePracticeTaskComplete}
            isPractice={true}
            currentTaskId={currentPractice}
          />
        )}

        {game === "3" && (
          <TypingTask
            taskNum={taskNum}
            onComplete={handlePracticeTaskComplete}
            isPractice={true}
            currentTaskId={currentPractice}
          />
        )}
      </div>
    </div>
  );
}

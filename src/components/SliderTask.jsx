// src/components/SliderTask.jsx - COMPLETE FILE WITH AI INTEGRATION
import React, { useEffect, useState, useRef } from "react";
import { eventTracker } from "../utils/eventTracker";
import { patternGenerator } from "../utils/patternGenerator";
import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import "./SliderTask.css";

export default function SliderTask({
  taskNum,
  onComplete,
  isPractice = false,
  currentTaskId,
  preGeneratedPattern = null,
}) {
  const [target, setTarget] = useState(5);
  const [input, setInput] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [startTime] = useState(Date.now());
  const [step, setStep] = useState(1);
  const [showValue, setShowValue] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isAIControlled, setIsAIControlled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const sliderRef = useRef(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (isPractice) {
      // For practice mode, use integer values only (like easy mode)
      setTarget(3);
      setStep(1); // Changed from 0.01 to 1 for integer sliding
      setShowValue(true);
    } else {
      // Use pre-generated pattern if available, otherwise generate on the fly
      const pattern = preGeneratedPattern || patternGenerator.generateSliderPattern(taskNum);
      setTarget(pattern.target);
      setStep(pattern.step);
      setShowValue(pattern.showValue);
    }
    setInput(0);
    setFeedback(null);
    attemptsRef.current = 0;
  }, [taskNum, isPractice, preGeneratedPattern]);

  useEffect(() => {
    const handleAIHelp = (event) => {
      const { action, value, animate } = event.detail;

      if (action === "moveSlider") {
        setIsAIControlled(true);

        if (animate) {
          // Animate slider movement
          const startValue = parseFloat(input);
          const targetValue = parseFloat(value);
          const duration = 1000; // 1 second
          const steps = 30;
          let step = 0;

          const interval = setInterval(() => {
            step++;
            const progress = step / steps;
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue =
              startValue + (targetValue - startValue) * easedProgress;

            setInput(parseFloat(currentValue.toFixed(2)));

            if (step >= steps) {
              clearInterval(interval);
              setIsAIControlled(false);
              setInput(parseFloat(targetValue.toFixed(2)));
            }
          }, duration / steps);
        } else {
          setInput(parseFloat(value.toFixed(2)));
          setIsAIControlled(false);
        }
      }
    };

    window.addEventListener("aiSliderHelp", handleAIHelp);
    return () => window.removeEventListener("aiSliderHelp", handleAIHelp);
  }, [input]);

  // Add Enter key handler for submit
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && !isAIControlled) {
        handleSubmit();
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, [isAIControlled, input, target]);

  const handleMouseDown = (e) => {
    if (isAIControlled) return;

    const slider = sliderRef.current;
    if (!slider) return;

    // Prevent default to avoid text selection
    e.preventDefault();

    // Get click position (handle both mouse and touch)
    const rect = slider.getBoundingClientRect();
    const percent = input / 10;
    const thumbPosition = rect.left + rect.width * percent;
    const clickX = e.clientX || (e.touches && e.touches[0].clientX);

    // Check if click is near the thumb (within 30px for easier grabbing)
    if (Math.abs(clickX - thumbPosition) < 30) {
      setIsDragging(true);
      setHasInteracted(true);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || isAIControlled) return;

    const slider = sliderRef.current;
    if (!slider) return;

    const rect = slider.getBoundingClientRect();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const percent = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    const value = percent * 10;

    // Snap to step
    const snappedValue = Math.round(value / step) * step;
    setInput(parseFloat(snappedValue.toFixed(2)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for drag
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMove = (e) => handleMouseMove(e);
      const handleGlobalUp = () => handleMouseUp();

      document.addEventListener("mousemove", handleGlobalMove);
      document.addEventListener("mouseup", handleGlobalUp);
      document.addEventListener("touchmove", handleGlobalMove);
      document.addEventListener("touchend", handleGlobalUp);

      return () => {
        document.removeEventListener("mousemove", handleGlobalMove);
        document.removeEventListener("mouseup", handleGlobalUp);
        document.removeEventListener("touchmove", handleGlobalMove);
        document.removeEventListener("touchend", handleGlobalUp);
      };
    }
  }, [isDragging, step, isAIControlled]);

  const calculateDifference = (userValue, targetValue) => {
    // Return absolute difference instead of accuracy percentage
    const user = parseFloat(userValue) || 0;
    const target = parseFloat(targetValue) || 0;
    const difference = Math.abs(user - target);

    // Return the actual difference value (not percentage)
    return difference;
  };

  const handleSubmit = async () => {
    const timeTaken = Date.now() - startTime;
    const userValue = parseFloat(input);
    const difference = Math.abs(userValue - target);
    const currentTaskId = `g2t${taskNum}`;

    // Check for AI help response tracking
    const lastAIHelp = localStorage.getItem(`lastAIHelp_${currentTaskId}`);
    if (lastAIHelp) {
      const helpData = JSON.parse(lastAIHelp);
      const timeBetween = Date.now() - helpData.timestamp;
      const playerAction = userValue === helpData.suggestion ? "accepted" : "modified";
      
      await eventTracker.trackAIHelpResponse(
        currentTaskId,
        helpData.type,
        helpData.suggestion,
        playerAction,
        userValue,
        timeBetween
      );
      
      // Clear the stored help data
      localStorage.removeItem(`lastAIHelp_${currentTaskId}`);
    }

    // Calculate points based on difference
    let points = 0;
    if (difference === 0) {
      points = 2; // Exact match
    } else if (difference <= 1) {
      points = 1; // Within 1
    } else {
      points = 0; // Otherwise
    }

    attemptsRef.current += 1;

    await eventTracker.trackTaskAttempt(
      currentTaskId,
      attemptsRef.current,
      true, // Always passes
      timeTaken,
      userValue,
      target
    );

    const sessionId = localStorage.getItem("sessionId");
    if (sessionId && !sessionId.startsWith("offline-")) {
      try {
        await updateDoc(doc(db, "sessions", sessionId), {
          [`taskDifferences.g2t${taskNum}`]: difference,
          [`taskTimes.g2t${taskNum}`]: timeTaken,
          [`taskPoints.g2t${taskNum}`]: points,
          lastActivity: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error storing difference:", error);
      }
    }

    // Always complete, show points earned
    if (points === 2) {
      setFeedback("✓ Perfect! 2 points earned!");
    } else if (points === 1) {
      setFeedback(`✓ Off by ${difference.toFixed(2)} - 1 point earned!`);
    } else {
      setFeedback(`✓ Off by ${difference.toFixed(2)} - 0 points earned.`);
    }

    // Keep feedback visible for 0.5 seconds, then complete
    setTimeout(() => {
      onComplete(`g2t${taskNum}`, {
        attempts: attemptsRef.current,
        totalTime: timeTaken,
        accuracy: points === 2 ? 100 : points === 1 ? 70 : 0,
        userAnswer: userValue, // or input for typing/counting
        correctAnswer: target, // or pattern for typing
        points: points, // THIS IS CRITICAL - must include points
      });
    }, 500);
  };

  const pattern = patternGenerator.generateSliderPattern(taskNum);
  const difficultyLabel = pattern.difficultyLabel;
  const difficultyColor = pattern.difficulty;

  const generateScaleMarks = () => {
    const marks = [];
    for (let i = 0; i <= 10; i++) {
      marks.push(
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${i * 10}%`,
            transform: "translateX(-50%)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "2px",
              height: "12px",
              background: "#666",
              margin: "0 auto",
            }}
          />
          <div
            style={{
              fontSize: "12px",
              color: "#666",
              marginTop: "2px",
            }}
          >
            {i}
          </div>
        </div>
      );
    }
    return marks;
  };

  return (
    <div className={`task slider ${isAIControlled ? "ai-controlled" : ""}`}>
      <h3>Material Creation - Level {taskNum}</h3>
      <div className={`difficulty-badge ${difficultyColor}`}>
        {difficultyLabel}
      </div>
      <p className="instruction">
        Move the slider to:{" "}
        <strong className="target-value" data-target-value={target}>
          {target}
        </strong>
        <br />
        <span style={{ fontSize: "14px", color: "#666", fontStyle: "italic" }}>
          {!hasInteracted && "Hold and drag the slider handle to move it"}
        </span>
      </p>
      <div className="slider-container">
        <div className="range-labels">
          <span>0</span>
          <span>10</span>
        </div>

        <div style={{ position: "relative", padding: "20px 0 30px 0" }}>
          {/* Scale marks - only show if we want them */}
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "20px",
              top: "0",
            }}
          >
            {generateScaleMarks()}
          </div>

          {/* Custom slider with click prevention */}
          <div style={{ position: "relative", marginTop: "20px" }}>
            <input
              ref={sliderRef}
              type="range"
              min="0"
              max="10"
              step={step}
              value={input}
              onChange={(e) => {
                // Allow direct value changes when not dragging
                if (!isDragging && !isAIControlled) {
                  setInput(parseFloat(e.target.value));
                  setHasInteracted(true);
                }
              }}
              className="slider-input"
              style={{
                width: "100%",
                cursor: isDragging ? "grabbing" : "grab",
              }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
            />
          </div>
        </div>

        <div className="current-value">
          {showValue ? parseFloat(input).toFixed(isPractice ? 0 : pattern.precision) : "??"}
        </div>
      </div>
      <button
        onClick={handleSubmit}
        className="submit-btn"
        disabled={isAIControlled}
        style={{
          display: "block", // align buttom
          margin: "20px auto 0", // Changed from just marginTop
        }}
      >
        Submit
      </button>
      {feedback && (
        <div
          className={`feedback ${
            feedback.includes("2 points")
              ? "correct"
              : feedback.includes("0 points")
              ? "incorrect"
              : "partial"
          }`}
        >
          {feedback}
        </div>
      )}
    </div>
  );
}

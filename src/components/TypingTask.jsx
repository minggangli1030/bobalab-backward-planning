// src/components/TypingTask.jsx - FIXED onComplete call
import React, { useEffect, useState, useRef } from "react";
import { eventTracker } from "../utils/eventTracker";
import { patternGenerator } from "../utils/patternGenerator";
import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import "./TypingTask.css";

export default function TypingTask({
  taskNum,
  onComplete,
  isPractice = false,
  currentTaskId,
  preGeneratedPattern = null,
}) {
  const [pattern, setPattern] = useState("");
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [startTime] = useState(Date.now());
  const [patternImageUrl, setPatternImageUrl] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const attemptsRef = useRef(0);

  // Generate uncopyable pattern image
  const generatePatternImage = (patternText) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 600;
    canvas.height = 150;

    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 40px "Courier New", monospace';
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(patternText, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL();
  };

  useEffect(() => {
    // Use pre-generated pattern if available, otherwise generate on the fly
    const generatedPattern = preGeneratedPattern || patternGenerator.generateTypingPattern(taskNum);

    // Store the actual pattern that will be used
    const actualPattern = generatedPattern.pattern;

    setPattern(actualPattern);

    // Generate image with the actual pattern
    const imageUrl = generatePatternImage(actualPattern);
    setPatternImageUrl(imageUrl);
  }, [taskNum, preGeneratedPattern]);

  // Clear input when task changes
  useEffect(() => {
    setInput("");
    setFeedback(null);
    attemptsRef.current = 0;
  }, [taskNum]);

  // Listen for AI help
  useEffect(() => {
    const handleAIHelp = (event) => {
      const { action, text, typeSpeed } = event.detail;

      if (action === "autoType" && text) {
        setIsAITyping(true);
        setInput(""); // Clear input first

        // Type character by character
        let typedText = "";
        let index = 0;
        const typeInterval = setInterval(() => {
          if (index < text.length) {
            typedText += text[index];
            setInput(typedText);
            index++;
          } else {
            clearInterval(typeInterval);
            setIsAITyping(false);
          }
        }, typeSpeed || 50);

        // Store interval for cleanup
        return () => clearInterval(typeInterval);
      }
    };

    window.addEventListener("aiTypingHelp", handleAIHelp);
    return () => window.removeEventListener("aiTypingHelp", handleAIHelp);
  }, []);

  const calculateAccuracy = (userInput, expectedPattern) => {
    if (userInput === expectedPattern) return 100;

    const maxLength = Math.max(userInput.length, expectedPattern.length);
    if (maxLength === 0) return 0;

    let matches = 0;
    for (let i = 0; i < maxLength; i++) {
      if (userInput[i] === expectedPattern[i]) {
        matches++;
      }
    }

    const accuracy = (matches / maxLength) * 100;
    return Math.round(accuracy);
  };

  const handleSubmit = async () => {
    const timeTaken = Date.now() - startTime;
    const currentTaskId = `g3t${taskNum}`;

    // Check for AI help response tracking and get AI help data
    const lastAIHelp = localStorage.getItem(`lastAIHelp_${currentTaskId}`);
    const aiHelpData = lastAIHelp ? JSON.parse(lastAIHelp) : null;
    
    if (lastAIHelp && aiHelpData) {
      const timeBetween = Date.now() - aiHelpData.timestamp;
      const playerAction = input === aiHelpData.suggestion ? "accepted" : "modified";
      
      await eventTracker.trackAIHelpResponse(
        currentTaskId,
        aiHelpData.type,
        aiHelpData.suggestion,
        playerAction,
        input,
        timeBetween
      );
      
      // Clear the stored help data
      localStorage.removeItem(`lastAIHelp_${currentTaskId}`);
    }

    // Calculate Levenshtein distance for typo detection
    const calculateLevenshteinDistance = (str1, str2) => {
      const m = str1.length;
      const n = str2.length;
      const dp = Array(m + 1)
        .fill(null)
        .map(() => Array(n + 1).fill(0));

      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;

      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (str1[i - 1] === str2[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1];
          } else {
            dp[i][j] = Math.min(
              dp[i - 1][j] + 1,
              dp[i][j - 1] + 1,
              dp[i - 1][j - 1] + 1
            );
          }
        }
      }
      return dp[m][n];
    };

    const distance = calculateLevenshteinDistance(input, pattern);

    // Calculate points based on typos
    let points = 0;
    if (distance === 0) {
      points = 2; // Perfect match
    } else if (distance === 1) {
      points = 1; // One typo
    } else {
      points = 0; // Otherwise
    }

    attemptsRef.current += 1;

    await eventTracker.trackTaskAttempt(
      currentTaskId,
      {
        attempts: attemptsRef.current,
        passed: true,
        timeTaken,
        playerSubmission: input, // What player submitted
        goal: pattern, // Ground truth
        aiSubmission: aiHelpData?.suggestion || null, // What AI suggested (if used)
      }
    );

    const sessionId = localStorage.getItem("sessionId");
    if (sessionId && !sessionId.startsWith("offline-")) {
      try {
        await updateDoc(doc(db, "sessions", sessionId), {
          [`taskAccuracies.g3t${taskNum}`]:
            points === 2 ? 100 : points === 1 ? 70 : 0,
          [`taskTimes.g3t${taskNum}`]: timeTaken,
          [`taskPoints.g3t${taskNum}`]: points,
          lastActivity: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error storing accuracy:", error);
      }
    }

    // Always complete, show points earned
    if (points === 2) {
      setFeedback("✓ Perfect! 2 points earned!");
    } else if (points === 1) {
      setFeedback("✓ 1 typo - 1 point earned!");
    } else {
      setFeedback(`✓ ${distance} errors - 0 points earned.`);
    }

    // Keep feedback visible for 0.5 seconds, then complete
    setTimeout(() => {
      // Get AI help if used
      const lastAIHelp = localStorage.getItem(`lastAIHelp_g3t${taskNum}`);
      const aiHelpData = lastAIHelp ? JSON.parse(lastAIHelp) : null;

      onComplete(`g3t${taskNum}`, {
        attempts: attemptsRef.current,
        totalTime: timeTaken,
        accuracy: points === 2 ? 100 : points === 1 ? 70 : 0,
        userAnswer: input, // Player submission
        input: input, // Alias for compatibility
        correctAnswer: pattern, // Ground truth
        pattern: pattern, // Alias for compatibility
        aiHelpValue: aiHelpData?.suggestion || null, // AI submission (if used)
        points: points,
      });
    }, 500);
  };

  const patternInfo = patternGenerator.generateTypingPattern(taskNum);
  const difficultyLabel = patternInfo.difficultyLabel;
  const difficultyColor = patternInfo.difficulty;

  return (
    <div className="task typing" style={{ maxWidth: "100%" }}>
      <h3>Student Engagement - Level {taskNum}</h3>
      <div className={`difficulty-badge ${difficultyColor}`}>
        {difficultyLabel}
      </div>

      <p className="instruction">Type this pattern exactly:</p>

      <div className="pattern-display">
        {/* Store pattern in hidden div for AI to find */}
        <div
          className="typing-pattern"
          data-typing-pattern={pattern}
          style={{ display: "none" }}
        >
          {pattern}
        </div>
        {patternImageUrl ? (
          <img
            src={patternImageUrl}
            alt="Pattern to type"
            style={{
              width: "100%",
              maxWidth: "600px",
              height: "auto",
              userSelect: "none",
              pointerEvents: "none",
            }}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        ) : (
          <span className="pattern-text">{pattern}</span>
        )}
      </div>

      <div
        className="input-section"
        style={{ width: "90%", maxWidth: "900px", margin: "20px auto 0" }}
      >
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={input}
          onChange={(e) => !isAITyping && setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !isAITyping) {
              e.preventDefault(); // Prevent form submission default
              handleSubmit();
            }
          }}
          placeholder="Type here..."
          className="typing-input"
          disabled={isAITyping}
          style={{
            backgroundColor: isAITyping ? "#e3f2fd" : "white",
            transition: "background-color 0.3s",
            width: "100%",
            maxWidth: "100%",
            fontFamily: '"Courier New", monospace',
            fontSize: "28px",
            padding: "12px 14px",
            border: "2px solid #e0e0e0",
            borderRadius: "8px",
            boxSizing: "border-box",
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        className="submit-btn"
        disabled={isAITyping}
        style={{
          display: "block",
          margin: "20px auto 0",
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

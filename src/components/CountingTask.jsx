// src/components/CountingTask.jsx - FIXED onComplete call
import React, { useEffect, useState, useRef } from "react";
import { eventTracker } from "../utils/eventTracker";
import { patternGenerator } from "../utils/patternGenerator";
import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import "./CountingTask.css";

export default function CountingTask({
  taskNum,
  onComplete,
  isPractice = false,
  currentTaskId, // currently unused but kept for compatibility
  preGeneratedPattern = null,
  preGeneratedText = null,
}) {
  const [target, setTarget] = useState("");
  const [instruction, setInstruction] = useState("");
  const [answer, setAnswer] = useState(null);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [text, setText] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [startTime] = useState(Date.now());
  const [textImageUrl, setTextImageUrl] = useState("");
  const [aiHighlightActive, setAiHighlightActive] = useState(false);
  const [highlightedIndices, setHighlightedIndices] = useState(new Set());
  const attemptsRef = useRef(0);
  const canvasRef = useRef(null);

  // Generate uncopyable text image with optional highlights
  const generateTextImage = (
    textContent,
    highlights = null,
    aiHighlights = null
  ) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 900;
    canvas.height = 400;

    // Background
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    ctx.font = "24px monospace";
    ctx.fillStyle = "#333";

    const lineHeight = 36;
    const padding = 25;
    const maxWidth = canvas.width - padding * 2;

    const wrapText = (t, maxW) => {
      const words = t.split(" ");
      const lines = [];
      let currentLine = "";
      for (let word of words) {
        const testLine = currentLine + (currentLine ? " " : "") + word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxW && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    const lines = wrapText(textContent, maxWidth);

    // Draw text with highlights
    lines.forEach((line, lineIndex) => {
      const y = padding + (lineIndex + 1) * lineHeight;
      let x = padding;

      if (taskNum <= 5) {
        // Word-level highlighting
        const words = line.split(" ");
        let wordIndex = 0;

        words.forEach((word) => {
          const shouldAIHighlight = aiHighlights && aiHighlights.has(wordIndex);
          const shouldUserHighlight =
            highlights &&
            highlights.some((h) => word.toLowerCase() === h.toLowerCase());

          if (shouldAIHighlight) {
            const w = ctx.measureText(word).width;
            ctx.fillStyle = "yellow";
            ctx.fillRect(x - 2, y - 18, w + 4, 24);
          } else if (shouldUserHighlight) {
            const w = ctx.measureText(word).width;
            ctx.fillStyle = "rgba(255, 215, 0, 0.4)";
            ctx.fillRect(x - 2, y - 18, w + 4, 24);
          }

          ctx.fillStyle = "#333";
          ctx.fillText(word, x, y);
          x += ctx.measureText(word + " ").width;
          wordIndex++;
        });
      } else {
        // Character-level highlighting
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const cw = ctx.measureText(char).width;

          const highlightChar =
            highlights &&
            highlights.some((h) => char.toLowerCase() === h.toLowerCase());

          if (highlightChar) {
            ctx.fillStyle = "rgba(255, 215, 0, 0.4)";
            ctx.fillRect(x - 1, y - 18, cw + 2, 24);
          }

          ctx.fillStyle = "#333";
          ctx.fillText(char, x, y);
          x += cw;
        }
      }
    });

    return canvas.toDataURL();
  };

  useEffect(() => {
    setInput(0);
    setFeedback(null);
    attemptsRef.current = 0;
  }, [taskNum]);

  useEffect(() => {
    // Function to handle letter/character highlighting
    const handleLetterHighlighting = async (targetLetters, suggestedCount) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 900;
      canvas.height = 350;

      // Background + border
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#e0e0e0";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      ctx.font = "24px monospace";
      const lineHeight = 36;
      const padding = 20;
      const maxWidth = canvas.width - padding * 2;

      const wrapText = (t, maxW) => {
        const words = t.split(" ");
        const lines = [];
        let currentLine = "";
        for (let word of words) {
          const testLine = currentLine + (currentLine ? " " : "") + word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxW && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
      };

      const lines = wrapText(text, maxWidth);

      // Animate letter highlighting
      for (let letterIndex = 0; letterIndex < targetLetters.length; letterIndex++) {
        const targetLetter = targetLetters[letterIndex];
        
        // Draw text with character-level highlighting
        lines.forEach((line, lineIndex) => {
          const y = padding + (lineIndex + 1) * lineHeight;
          let x = padding;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const charWidth = ctx.measureText(char).width;
            
            // Check if this character matches any target letter
            const shouldHighlight = targetLetters.some(letter => 
              char.toLowerCase() === letter.toLowerCase()
            );
            
            if (shouldHighlight) {
              // Highlight with yellow background
              ctx.fillStyle = "rgba(255, 255, 0, 0.6)";
              ctx.fillRect(x - 1, y - 20, charWidth + 2, 26);
            }
            
            // Draw the character
            ctx.fillStyle = "#333";
            ctx.fillText(char, x, y);
            
            x += charWidth;
          }
        });
        
        setTextImageUrl(canvas.toDataURL());
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Fill in the count after animation completes
      setTimeout(() => {
        setInput(suggestedCount.toString());
      }, 300);
    };

    const handleAIHelp = async (event) => {
      const { action, highlightWords, suggestedCount, animate, isMultiLetter, targetLetters } =
        event.detail || {};

      if (action === "highlightAndCount") {
        // Handle letter/character highlighting for medium/hard levels
        if (isMultiLetter && Array.isArray(targetLetters)) {
          if (animate) {
            await handleLetterHighlighting(targetLetters, suggestedCount);
          }
          return;
        }
        
        // Handle word highlighting for easy levels
        if (Array.isArray(highlightWords)) {
          if (animate) {
            // Animate highlighting word by word
          const words = text.split(" ");
          let highlightedSoFar = [];

          for (let i = 0; i < highlightWords.length; i++) {
            highlightedSoFar.push(highlightWords[i]);

            // Generate image with current highlights
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = 900;
            canvas.height = 350;

            // Background + border
            ctx.fillStyle = "#fafafa";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = "#e0e0e0";
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);

            ctx.font = "24px monospace";
            const lineHeight = 36;
            const padding = 20;
            const maxWidth = canvas.width - padding * 2;

            const wrapText = (t, maxW) => {
              const words = t.split(" ");
              const lines = [];
              let currentLine = "";
              for (let word of words) {
                const testLine = currentLine + (currentLine ? " " : "") + word;
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxW && currentLine) {
                  lines.push(currentLine);
                  currentLine = word;
                } else {
                  currentLine = testLine;
                }
              }
              if (currentLine) lines.push(currentLine);
              return lines;
            };

            const lines = wrapText(text, maxWidth);

            // Draw with highlights
            lines.forEach((line, lineIndex) => {
              const y = padding + (lineIndex + 1) * lineHeight;
              let x = padding;
              const lineWords = line.split(" ");

              lineWords.forEach((word) => {
                const w = ctx.measureText(word).width;

                // Check if this word should be highlighted
                const shouldHighlight = highlightedSoFar.some((hw) => {
                  const cleanWord = word.replace(/[.,;!?]/g, "").toLowerCase();
                  const cleanHW = hw.replace(/[.,;!?]/g, "").toLowerCase();
                  return cleanWord === cleanHW;
                });

                if (shouldHighlight) {
                  ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
                  ctx.fillRect(x - 2, y - 18, w + 4, 24);
                }

                ctx.fillStyle = "#333";
                ctx.fillText(word, x, y);
                x += ctx.measureText(word + " ").width;
              });
            });

            setTextImageUrl(canvas.toDataURL());

            // Wait 500ms before next highlight
            await new Promise((resolve) => setTimeout(resolve, 200));
          }

          // Fill in the count after animation completes
          setTimeout(() => {
            setInput(suggestedCount.toString());
          }, 300);

            // Keep the final highlighted image (don't revert)
          }
        }
      }
    };

    window.addEventListener("aiCountingHelp", handleAIHelp);
    return () => window.removeEventListener("aiCountingHelp", handleAIHelp);
  }, [text, taskNum]);

  // Initialize task content, correct answer, and first image
  useEffect(() => {
    // Use pre-generated pattern if available, otherwise generate on the fly
    const pattern = preGeneratedPattern || patternGenerator.generateCountingPattern(taskNum);
    const textContent = preGeneratedText || patternGenerator.getTextPassage(taskNum);

    setText(textContent);
    setTarget(pattern.target || pattern.targets?.join(", "));
    setInstruction(pattern.instruction);

    // Compute ground-truth count
    let count = 0;
    if (pattern.type === "word") {
      const regex = new RegExp(`\\b${pattern.target}\\b`, "gi");
      const matches = textContent.match(regex);
      count = matches ? matches.length : 0;
    } else if (pattern.type === "letter") {
      const regex = new RegExp(pattern.target, "gi");
      const matches = textContent.match(regex);
      count = matches ? matches.length : 0;
    } else if (pattern.type === "multi-letter") {
      pattern.targets.forEach((letter) => {
        const regex = new RegExp(letter, "gi");
        const matches = textContent.match(regex);
        count += matches ? matches.length : 0;
      });
    }

    setAnswer(count);

    const imageUrl = generateTextImage(textContent, null);
    setTextImageUrl(imageUrl);
  }, [taskNum, preGeneratedPattern, preGeneratedText]);

  const calculateAccuracy = (userAnswer, correctAnswer) => {
    if (userAnswer === correctAnswer) return 100;
    const maxPossible = Math.max(userAnswer, correctAnswer, 1);
    const difference = Math.abs(userAnswer - correctAnswer);
    const accuracy = Math.max(0, 100 - (difference / maxPossible) * 100);
    return Math.round(accuracy);
  };

  const handleSubmit = async () => {
    const timeTaken = Date.now() - startTime;
    const userAnswer = parseInt(input, 10) || 0;
    const correctAnswer = answer ?? 0;
    const difference = Math.abs(userAnswer - correctAnswer);
    const currentTaskId = `g1t${taskNum}`;

    // Check for AI help response tracking and get AI help data
    const lastAIHelp = localStorage.getItem(`lastAIHelp_${currentTaskId}`);
    const aiHelpData = lastAIHelp ? JSON.parse(lastAIHelp) : null;
    
    if (lastAIHelp && aiHelpData) {
      const timeBetween = Date.now() - aiHelpData.timestamp;
      const playerAction = userAnswer === aiHelpData.suggestion ? "accepted" : "modified";
      
      await eventTracker.trackAIHelpResponse(
        currentTaskId,
        aiHelpData.type,
        aiHelpData.suggestion,
        playerAction,
        userAnswer,
        timeBetween
      );
      
      // Clear the stored help data
      localStorage.removeItem(`lastAIHelp_${currentTaskId}`);
    }

    // Calculate points based on accuracy
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
      {
        attempts: attemptsRef.current,
        passed: true,
        timeTaken,
        playerSubmission: userAnswer, // What player submitted
        goal: correctAnswer, // Ground truth
        aiSubmission: aiHelpData?.suggestion || null, // What AI suggested (if used)
      }
    );

    const sessionId = localStorage.getItem("sessionId");
    if (sessionId && !sessionId.startsWith("offline-")) {
      try {
        await updateDoc(doc(db, "sessions", sessionId), {
          [`taskAccuracies.g1t${taskNum}`]:
            points === 2 ? 100 : points === 1 ? 70 : 0,
          [`taskTimes.g1t${taskNum}`]: timeTaken,
          [`taskPoints.g1t${taskNum}`]: points,
          lastActivity: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error storing accuracy:", error);
      }
    }

    // Always complete the task, but show points earned
    if (points === 2) {
      setFeedback("✓ Perfect! 2 points earned!");
    } else if (points === 1) {
      setFeedback(`✓ Off by ${difference} - 1 point earned!`);
    } else {
      setFeedback(`✓ Off by ${difference} - 0 points earned.`);
    }

    // Keep feedback visible for 0.5 seconds, then complete
    setTimeout(() => {
      onComplete?.(`g1t${taskNum}`, {
        attempts: attemptsRef.current,
        totalTime: timeTaken,
        accuracy: points === 2 ? 100 : points === 1 ? 70 : 0,
        userAnswer: userAnswer, // Player submission
        correctAnswer: correctAnswer, // Ground truth
        aiHelpValue: aiHelpData?.suggestion || null, // AI submission (if used)
        points: points,
      });
    }, 500);
  };

  // Derive difficulty UI from pattern
  const patternNow = patternGenerator.generateCountingPattern(taskNum);
  const difficultyLabel = patternNow.difficultyLabel;
  const difficultyColor =
    taskNum <= 5 ? "easy" : taskNum <= 10 ? "medium" : "hard";

  return (
    <div className="task counting">
      <h3>Research Content - Level {taskNum}</h3>
      <div className={`difficulty-badge ${difficultyColor}`}>
        {difficultyLabel}
      </div>
      <p className="instruction">
        <strong>{instruction}</strong>
        <br />
        <span className="hint">(Case-insensitive)</span>
      </p>
      <div className="text-display text-to-count" data-counting-text={text}>
        <div
          className="count-target"
          data-pattern={target}
          style={{ display: "none" }}
        >
          {target}
        </div>

        {textImageUrl ? (
          <img
            src={textImageUrl}
            alt="Text passage for counting"
            style={{
              width: "100%",
              maxWidth: "900px",
              height: "auto",
              maxHeight: "350px",
              objectFit: "contain",
              border: "none",
              userSelect: "none",
              pointerEvents: "none",
            }}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: displayText }} />
        )}
      </div>
      <div className="input-section">
        <label>Your answer:</label>
        <input
          type="number"
          min="0"
          max="999"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
          placeholder="Enter count"
        />
      </div>
      <button
        onClick={handleSubmit}
        className="submit-btn"
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

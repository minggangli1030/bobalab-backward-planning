// src/components/ChatContainer.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef } from "react";
import { eventTracker } from "../utils/eventTracker";
import "./ChatContainer.css";

class AITaskHelper {
  constructor() {
    // Track total AI usage across ALL tasks for this player
    this.totalAIUsage = 0; // Universal counter across all tasks
    this.usageCount = {
      materials: 0,
      research: 0,
      engagement: 0,
    };
    this.taskUsageCount = {}; // Track usage per specific task
  }

  // Get the universal AI attempt number (across all tasks)
  getUniversalAttemptNumber() {
    return this.totalAIUsage;
  }

  // Determine if AI should be correct based on universal pattern
  shouldAIBeCorrect(attemptNumber) {
    let isCorrect;

    if (
      attemptNumber === 1 ||
      attemptNumber === 2 ||
      attemptNumber === 4 ||
      attemptNumber === 5
    ) {
      // Attempts 1, 2, 4, 5 are always correct
      isCorrect = true;
    } else if (attemptNumber === 3) {
      // Attempt 3 is always wrong by 1 (to earn 1 point)
      isCorrect = false;
    } else {
      // Attempts 6+ have 75% chance of being correct
      isCorrect = Math.random() < 0.75;
    }

    return isCorrect;
  }

  getTaskUsageCount(taskId) {
    if (!this.taskUsageCount[taskId]) {
      this.taskUsageCount[taskId] = 0;
    }
    return this.taskUsageCount[taskId];
  }

  incrementTaskUsage(taskId, category) {
    this.totalAIUsage++; // Increment universal counter
    this.usageCount[category]++;
    if (!this.taskUsageCount[taskId]) {
      this.taskUsageCount[taskId] = 0;
    }
    this.taskUsageCount[taskId]++;
  }

  // Reset AI usage for new semester
  resetForNewSemester() {
    this.totalAIUsage = 0;
    this.usageCount = {
      materials: 0,
      research: 0,
      engagement: 0,
    };
    this.taskUsageCount = {};
    console.log("🔄 AI Help usage reset for new semester");
  }

  helpWithSlider(targetValue, currentTaskId) {
    this.incrementTaskUsage(currentTaskId, "materials");
    const attemptNumber = this.getUniversalAttemptNumber();

    let suggestedValue;

    if (this.shouldAIBeCorrect(attemptNumber)) {
      // AI gives correct answer
      suggestedValue = targetValue;
    } else if (attemptNumber === 3) {
      // Attempt 3: always off by 1 (to earn 1 point)
      const error = Math.random() < 0.5 ? -1 : 1;
      suggestedValue = Math.max(0, Math.min(10, targetValue + error));
    } else {
      // Attempts 6+: when wrong, be off by 1 (1 point) or more (0 points)
      if (Math.random() < 0.5) {
        // Off by 1 (still gets 1 point)
        const error = Math.random() < 0.5 ? -1 : 1;
        suggestedValue = Math.max(0, Math.min(10, targetValue + error));
      } else {
        // Way off (0 points)
        const error = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2);
        suggestedValue = Math.max(0, Math.min(10, targetValue + error));
      }
    }

    return {
      action: "moveSlider",
      value: suggestedValue,
      animate: true,
    };
  }

  helpWithCounting(text, targetPattern, currentTaskId) {
    this.incrementTaskUsage(currentTaskId, "research");
    const attemptNumber = this.getUniversalAttemptNumber();
    const isCorrect = this.shouldAIBeCorrect(attemptNumber);

    // Check if we're counting single letters/characters (medium/hard level)
    const isLetterCounting =
      targetPattern.length === 1 ||
      targetPattern.includes(" and ") ||
      targetPattern.includes(",");

    if (isLetterCounting) {
      return this.helpWithLetterCounting(
        text,
        targetPattern,
        attemptNumber,
        isCorrect
      );
    } else {
      return this.helpWithWordCounting(
        text,
        targetPattern,
        attemptNumber,
        isCorrect
      );
    }
  }

  helpWithLetterCounting(text, targetPattern, attemptNumber, isCorrect) {
    // Extract target letters from pattern like "a", "a and e", or "a, e"
    let targetLetters = [];
    if (targetPattern.includes(" and ") || targetPattern.includes(",")) {
      targetLetters = targetPattern.match(/[a-z]/gi) || [];
    } else {
      targetLetters = [targetPattern];
    }

    // Calculate correct count
    let correctCount = 0;
    targetLetters.forEach((letter) => {
      const regex = new RegExp(letter, "gi");
      const matches = text.match(regex);
      correctCount += matches ? matches.length : 0;
    });

    let aiCount = correctCount;
    let highlightLetters = [...targetLetters]; // For letter highlighting

    // Apply accuracy based on attempt number
    if (!isCorrect) {
      if (attemptNumber === 3) {
        // Attempt 3: always off by 1 (over-highlight for visibility)
        aiCount = correctCount + 1; // Always add one extra
      } else {
        // Attempts 6+: 25% chance of being wrong
        if (Math.random() < 0.5) {
          // Off by 1 (over-highlight for visibility)
          aiCount = correctCount + 1; // Always add one extra
        } else {
          // Way off (over-highlight significantly)
          aiCount = correctCount + Math.floor(Math.random() * 3) + 2; // Add 2-4 extra
        }
      }
      aiCount = Math.max(0, aiCount);

      // For wrong answers, ALWAYS highlight extra wrong letters for visibility
      const allLetters = "abcdefghijklmnopqrstuvwxyz".split("");
      const wrongLetters = allLetters.filter(
        (l) => !targetLetters.includes(l.toLowerCase())
      );
      const numExtraLetters = Math.floor(Math.random() * 2) + 1; // Add 1-2 extra letters
      for (let i = 0; i < numExtraLetters && wrongLetters.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * wrongLetters.length);
        highlightLetters.push(wrongLetters[randomIndex]);
        wrongLetters.splice(randomIndex, 1); // Remove to avoid duplicates
      }
    }

    return {
      action: "highlightAndCount",
      highlightWords: [], // Empty for letter counting
      suggestedCount: aiCount,
      animate: true,
      isMultiLetter: true,
      targetLetters: highlightLetters,
    };
  }

  helpWithWordCounting(text, targetPattern, attemptNumber, isCorrect) {
    const words = text.split(/\s+/);
    const highlightWords = [];
    let aiCount = 0;

    // Calculate correct count first
    let correctCount = 0;
    words.forEach((word) => {
      const cleanWord = word.replace(/[.,;!?]/g, "").toLowerCase();
      if (cleanWord === targetPattern.toLowerCase()) {
        correctCount++;
      }
    });

    if (isCorrect) {
      // AI gives correct answer
      words.forEach((word) => {
        const cleanWord = word.replace(/[.,;!?]/g, "").toLowerCase();
        if (cleanWord === targetPattern.toLowerCase()) {
          highlightWords.push(word);
          aiCount++;
        }
      });
    } else if (attemptNumber === 3) {
      // Attempt 3: always over-highlight by 1 for visibility
      aiCount = correctCount + 1;
      aiCount = Math.max(0, aiCount);

      // Highlight all correct words first
      words.forEach((word) => {
        const cleanWord = word.replace(/[.,;!?]/g, "").toLowerCase();
        if (cleanWord === targetPattern.toLowerCase()) {
          highlightWords.push(word);
        }
      });

      // Add extra highlights (wrong words) to make mistake obvious
      const nonTargetWords = words.filter((word) => {
        const cleanWord = word.replace(/[.,;!?]/g, "").toLowerCase();
        return cleanWord !== targetPattern.toLowerCase();
      });
      if (nonTargetWords.length > 0 && highlightWords.length < aiCount) {
        const randomWrongWord =
          nonTargetWords[Math.floor(Math.random() * nonTargetWords.length)];
        highlightWords.push(randomWrongWord);
      }
    } else {
      // Attempts 6+: when wrong (25% of time), over-highlight
      if (Math.random() < 0.5) {
        // Off by 1 (over-highlight for visibility)
        aiCount = correctCount + 1;
      } else {
        // Way off (over-highlight significantly)
        aiCount = correctCount + Math.floor(Math.random() * 3) + 2; // Add 2-4 extra
      }
      aiCount = Math.max(0, aiCount);

      // Highlight all correct words first
      words.forEach((word) => {
        const cleanWord = word.replace(/[.,;!?]/g, "").toLowerCase();
        if (cleanWord === targetPattern.toLowerCase()) {
          highlightWords.push(word);
        }
      });

      // Add extra wrong highlights to reach aiCount
      const nonTargetWords = words.filter((word) => {
        const cleanWord = word.replace(/[.,;!?]/g, "").toLowerCase();
        return cleanWord !== targetPattern.toLowerCase();
      });

      while (highlightWords.length < aiCount && nonTargetWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * nonTargetWords.length);
        const wrongWord = nonTargetWords[randomIndex];
        if (!highlightWords.includes(wrongWord)) {
          highlightWords.push(wrongWord);
        }
        nonTargetWords.splice(randomIndex, 1);
      }
    }

    return {
      action: "highlightAndCount",
      highlightWords: highlightWords,
      suggestedCount: aiCount,
      animate: true,
    };
  }

  helpWithTyping(pattern, currentTaskId) {
    this.incrementTaskUsage(currentTaskId, "engagement");
    const attemptNumber = this.getUniversalAttemptNumber();

    let resultText = pattern;

    // Common character substitutions that look similar
    const similarChars = {
      0: ["o", "O"], // zero looks like o
      o: ["0"], // o looks like zero
      O: ["0"], // O looks like zero
      1: ["l", "I", "i"], // one looks like l, I, i
      l: ["1", "I", "i"], // l looks like one, I, i
      I: ["1", "l", "i"], // I looks like one, l, i
      i: ["1", "l", "I"], // i looks like one, l, I
      e: ["3"], // e looks like 3
      3: ["e"], // 3 looks like e
      a: ["@"], // a looks like @
      "@": ["a"], // @ looks like a
      s: ["5", "$"], // s looks like 5, $
      S: ["5", "$"], // S looks like 5, $
      5: ["s", "S"], // 5 looks like s
      $: ["s", "S"], // $ looks like s
      g: ["9"], // g looks like 9
      9: ["g"], // 9 looks like g
      b: ["6"], // b looks like 6
      6: ["b"], // 6 looks like b
      z: ["2"], // z looks like 2
      2: ["z"], // 2 looks like z
      B: ["8"], // B looks like 8
      8: ["B"], // 8 looks like B
    };

    // Helper function to make a realistic typo
    const makeRealisticTypo = (text) => {
      const charArray = text.split("");
      const typableIndices = charArray
        .map((char, idx) => (similarChars[char] ? idx : -1))
        .filter((idx) => idx !== -1);

      if (typableIndices.length > 0) {
        // Pick a random position that has similar characters
        const indexToChange =
          typableIndices[Math.floor(Math.random() * typableIndices.length)];
        const originalChar = charArray[indexToChange];
        const similarOptions = similarChars[originalChar];

        if (similarOptions && similarOptions.length > 0) {
          // Replace with a similar-looking character
          charArray[indexToChange] =
            similarOptions[Math.floor(Math.random() * similarOptions.length)];
        }
      } else {
        // If no similar chars available, make a different kind of typo
        const errorTypes = ["transpose", "duplicate", "missing"];
        const errorType =
          errorTypes[Math.floor(Math.random() * errorTypes.length)];
        const index = Math.floor(Math.random() * charArray.length);

        switch (errorType) {
          case "transpose":
            // Swap adjacent characters
            if (index < charArray.length - 1) {
              [charArray[index], charArray[index + 1]] = [
                charArray[index + 1],
                charArray[index],
              ];
            }
            break;
          case "duplicate":
            // Duplicate a character
            charArray.splice(index, 0, charArray[index]);
            break;
          case "missing":
            // Remove a character
            charArray.splice(index, 1);
            break;
        }
      }

      return charArray.join("");
    };

    if (this.shouldAIBeCorrect(attemptNumber)) {
      // AI gives correct answer
      resultText = pattern;
    } else if (attemptNumber === 3) {
      // Attempt 3: always exactly 1 typo (to earn 1 point)
      resultText = makeRealisticTypo(pattern);
    } else {
      // Attempts 6+: when wrong (25% of time), make errors
      if (Math.random() < 0.5) {
        // Exactly 1 typo (still gets 1 point)
        resultText = makeRealisticTypo(pattern);
      } else {
        // Multiple errors (0 points)
        let modifiedText = pattern;
        const numErrors = Math.floor(Math.random() * 3) + 2; // 2-4 typos
        for (let i = 0; i < numErrors; i++) {
          modifiedText = makeRealisticTypo(modifiedText);
        }
        resultText = modifiedText;
      }
    }

    return {
      action: "autoType",
      text: resultText,
      typeSpeed: 50,
      perfect: this.shouldAIBeCorrect(attemptNumber),
    };
  }
}

const aiTaskHelper = new AITaskHelper();

// Export the AI helper instance for external access
export { aiTaskHelper };

export default function ChatContainer({
  bonusPrompts = 0,
  currentTask = "",
  categoryPoints = null,
  timeRemaining = null,
  calculateStudentLearning = () => 0,
  aiCost = 0,
  onAiCost,
}) {
  // Get the game config to check if AI is enabled
  const [hasAI, setHasAI] = useState(true);
  const [aiUsageCount, setAiUsageCount] = useState(0); // Track AI usage for display
  const [currentTaskUsed, setCurrentTaskUsed] = useState(false); // Track if AI used for current task

  useEffect(() => {
    const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
    setHasAI(config.hasAI !== false); // Default to true if not specified
  }, []);

  // Update currentTaskUsed when task changes
  useEffect(() => {
    if (currentTask) {
      const used = aiTaskHelper.getTaskUsageCount(currentTask) >= 1;
      setCurrentTaskUsed(used);
    }
  }, [currentTask]);

  // Sync AI usage count display with actual usage (for semester resets)
  useEffect(() => {
    const syncCount = () => {
      setAiUsageCount(aiTaskHelper.totalAIUsage);
    };
    
    // Check every second if the count needs syncing (for semester resets)
    const interval = setInterval(syncCount, 1000);
    
    // Also sync immediately
    syncCount();
    
    return () => clearInterval(interval);
  }, []);

  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: hasAI
        ? "Hello! I'm your AI teaching assistant. You get ONE AI help attempt per task - use it wisely!"
        : "Hello! This is the chat interface. AI assistance is not available for this session.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [lastHelpTime, setLastHelpTime] = useState({
    materials: 0,
    research: 0,
    engagement: 0,
  });
  const messagesEndRef = useRef(null);

  // Disabled scrollToBottom for Qualtrics embedding
  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // };

  // useEffect(() => {
  //   scrollToBottom();
  // }, [messages]);

  // Determine current game type
  const getCurrentGameType = () => {
    if (!currentTask) return null;
    if (currentTask.startsWith("g1")) return "research";
    if (currentTask.startsWith("g2")) return "materials";
    if (currentTask.startsWith("g3")) return "engagement";
    return null;
  };

  // Smart help function that detects current task
  const handleSmartHelp = (type = null) => {
    const gameType = type || getCurrentGameType();

    if (!gameType) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Please start a task first, then I can help you!",
        },
      ]);
      return;
    }

    // Check if AI has already been used for this specific task
    const taskUsageCount = aiTaskHelper.getTaskUsageCount(currentTask);
    if (taskUsageCount >= 1) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "❌ You've already used AI help for this task. Only 1 AI attempt allowed per task!",
        },
      ]);
      return;
    }

    // Rate limiting (3 seconds between helps)
    const now = Date.now();
    if (now - lastHelpTime[gameType] < 3000) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Please wait a moment before requesting help again!",
        },
      ]);
      return;
    }
    setLastHelpTime((prev) => ({ ...prev, [gameType]: now }));

    switch (gameType) {
      case "materials":
        handleSliderHelp();
        break;
      case "research":
        handleCountingHelp();
        break;
      case "engagement":
        handleTypingHelp();
        break;
      default:
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "I'm not sure which task you're on. Please try again!",
          },
        ]);
    }
  };

  // Handler for slider help (Materials)
  const handleSliderHelp = () => {
    const sliderTarget =
      document
        .querySelector("[data-target-value]")
        ?.getAttribute("data-target-value") ||
      document.querySelector(".target-value")?.textContent ||
      5;

    const help = aiTaskHelper.helpWithSlider(
      parseFloat(sliderTarget),
      currentTask
    );

    // Track AI help request
    const attemptNumber = aiTaskHelper.getUniversalAttemptNumber();
    const wasCorrect = aiTaskHelper.shouldAIBeCorrect(attemptNumber);

    eventTracker.trackAITaskHelp(
      currentTask,
      "slider",
      help.value,
      wasCorrect,
      attemptNumber
    );

    // Store help data for tracking response later
    localStorage.setItem(
      `lastAIHelp_${currentTask}`,
      JSON.stringify({
        type: "slider",
        suggestion: help.value,
        timestamp: Date.now(),
        wasCorrect,
      })
    );

    window.dispatchEvent(
      new CustomEvent("aiSliderHelp", {
        detail: help,
      })
    );

    setAiUsageCount(aiTaskHelper.totalAIUsage); // Update display counter
    setCurrentTaskUsed(true); // Mark current task as used

    setMessages((prev) => [
      ...prev,
      {
        sender: "bot",
        text: `📊 Helping with materials...
Suggested value: ${help.value.toFixed(
          2
        )}`,
      },
    ]);
  };

  const handleCountingHelp = () => {
    const textElement = document.querySelector(".text-to-count");
    const patternElement = document.querySelector(".count-target");

    if (textElement && patternElement) {
      const text = textElement.getAttribute("data-counting-text") || "";
      let pattern =
        patternElement
          .getAttribute("data-pattern")
          ?.replace(/['"]/g, "")
          .trim() || "";

      // Use the enhanced AITaskHelper that handles both words and letters
      const help = aiTaskHelper.helpWithCounting(text, pattern, currentTask);
      const suggestedCount = help.suggestedCount;

      window.dispatchEvent(new CustomEvent("aiCountingHelp", { detail: help }));

      // Track AI help request
      const attemptNumber = aiTaskHelper.getUniversalAttemptNumber();
      const wasCorrect = aiTaskHelper.shouldAIBeCorrect(attemptNumber);

      eventTracker.trackAITaskHelp(
        currentTask,
        "counting",
        suggestedCount,
        wasCorrect,
        attemptNumber
      );

      // Store help data for tracking response later
      localStorage.setItem(
        `lastAIHelp_${currentTask}`,
        JSON.stringify({
          type: "counting",
          suggestion: suggestedCount,
          timestamp: Date.now(),
          wasCorrect,
          highlightedWords: help.highlightWords || [],
          targetLetters: help.targetLetters || [],
        })
      );

      setAiUsageCount(aiTaskHelper.totalAIUsage); // Update display counter
      setCurrentTaskUsed(true); // Mark current task as used

      const countType = help.isMultiLetter ? "letters/characters" : "words";
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `🔬 Helping with research...
Found ${suggestedCount} ${countType}`,
        },
      ]);
    }
  };

  // Handler for planning/strategy help
  const handlePlanningHelp = () => {
    const planningResponses = [
      "🎯 CRITICAL STRATEGY: Do tasks in this EXACT order → 1️⃣ Engagement (builds interest from the start) 2️⃣ Research (multiplies future materials) 3️⃣ Materials (gets all multipliers). Materials done early = WASTED points!",
      "📊 MAXIMUM SCORE ORDER: Engagement FIRST → Research SECOND → Materials LAST! Why? Engagement compounds every task, Research only multiplies FUTURE materials. Doing materials early gets ZERO multiplier!",
      "⚠️ WARNING: Research multipliers ONLY apply to materials earned AFTER! If you do materials first, you get NO bonus. Always do ALL engagement & research before touching ANY materials!",
      "💡 PRO TIP: Complete 100% of Engagement tasks first (builds interest early), then 100% of Research (sets up multipliers), THEN do Materials. This order can DOUBLE your score vs doing materials first!",
      "🚀 OPTIMAL PATH: Think of it like this - Engagement = compound interest (starts early), Research = multiplier (affects future only), Materials = base score (save for last). Wrong order = lost points forever!",
    ];

    const response =
      planningResponses[Math.floor(Math.random() * planningResponses.length)];

    setMessages((prev) => [
      ...prev,
      {
        sender: "bot",
        text: response,
      },
    ]);

    // Log planning help request
    eventTracker.trackUserAction("planning_help_requested", {
      response: response,
      currentTask: currentTask,
      timestamp: Date.now(),
    });
  };

  // Handler for typing help (Engagement) - FIXED
  const handleTypingHelp = () => {
    const patternElement = document.querySelector("[data-typing-pattern]");

    if (patternElement) {
      const pattern = patternElement.getAttribute("data-typing-pattern");

      if (pattern) {
        const help = aiTaskHelper.helpWithTyping(pattern, currentTask);

        // Track AI help request
        const attemptNumber = aiTaskHelper.getUniversalAttemptNumber();
        const wasCorrect = help.perfect;

        eventTracker.trackAITaskHelp(
          currentTask,
          "typing",
          help.text,
          wasCorrect,
          attemptNumber
        );

        // Store help data for tracking response later
        localStorage.setItem(
          `lastAIHelp_${currentTask}`,
          JSON.stringify({
            type: "typing",
            suggestion: help.text,
            timestamp: Date.now(),
            wasCorrect,
            originalPattern: pattern,
          })
        );

        window.dispatchEvent(
          new CustomEvent("aiTypingHelp", {
            detail: help,
          })
        );

        setAiUsageCount(aiTaskHelper.totalAIUsage); // Update display counter
        setCurrentTaskUsed(true); // Mark current task as used

        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `✉️ Helping with engagement...
Typing: "${help.text.substring(
              0,
              30
            )}${help.text.length > 30 ? "..." : ""}"`,
      }
    ]);
      }
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Check if user has enough points
    if (aiCost > 0 && points < aiCost) {
        setMessages(prev => [...prev, {
            id: Date.now(),
            text: `Not enough points! You need ${aiCost} points to use AI help.`,
            sender: 'system'
        }]);
        return;
    }

    const userMsg = {
      id: Date.now(),
      text: input,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setProgress(0);

    // AI Delay Logic
    const delaySeconds = globalConfig?.aiDelay || 0;
    
    if (delaySeconds > 0) {
        const intervalTime = 100; // Update every 100ms
        const totalSteps = (delaySeconds * 1000) / intervalTime;
        let currentStep = 0;
        
        const timer = setInterval(() => {
            currentStep++;
            const newProgress = (currentStep / totalSteps) * 100;
            setProgress(newProgress);
            
            if (currentStep >= totalSteps) {
                clearInterval(timer);
                processAIResponse(userMsg.text);
            }
        }, intervalTime);
    } else {
        processAIResponse(userMsg.text);
    }
  };
  
  const processAIResponse = async (text) => {
    try {
      // Deduct cost
      if (onAiCost) onAiCost(aiCost);

      const response = await aiTaskHelper.getHelp(
        currentTaskId,
        text,
        taskContext
      );

      const aiMsg = {
        id: Date.now() + 1,
        text: response,
        sender: "ai",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "Sorry, I encountered an error. Please try again.",
          sender: "ai",
        },
      ]);
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };


  const currentGameType = getCurrentGameType();

  return (
    <div
      className="chat-container-sidebar"
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div className="chat-header">
        <h3>{hasAI ? "AI Teaching Assistant" : "Chat Interface"}</h3>
        <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
          {hasAI
            ? "1 AI help per task (reliability varies)"
            : "AI assistance disabled for this session"}
        </div>

        {/* Student Learning Score Display - always shown */}
        <div
          style={{
            marginTop: "10px",
            padding: "8px",
            background: "#e3f2fd",
            borderRadius: "6px",
            border: "1px solid #2196F3",
          }}
        >
          <div
            style={{ fontSize: "12px", color: "#1976d2", fontWeight: "bold" }}
          >
            Student Learning: {Math.round(calculateStudentLearning())} pts
          </div>
          <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>
             Mat: {(categoryPoints?.materials || 0)} × {(1 + (categoryPoints?.research || 0) * 0.15).toFixed(2)} 
             {categoryPoints?.bonus ? ` ${categoryPoints.bonus >= 0 ? '+' : '-'} ${Math.abs(categoryPoints.bonus)} (Penalties)` : ''} 
             + Interest
          </div>
        </div>
      </div>

      <div className="messages-sidebar">
        <div className="messages-list">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              <div className="message-content">{msg.text}</div>
            </div>
          ))}
          {isLoading && (
            <div className="message ai loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              {progress > 0 && (
                  <div style={{ width: '100%', height: '4px', background: '#eee', marginTop: '5px', borderRadius: '2px' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: '#2196F3', borderRadius: '2px', transition: 'width 0.1s linear' }}></div>
                  </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input */}
      <div className="chat-input-sidebar">
        <input
          type="text"
          placeholder={
            hasAI
              ? "Ask about strategy and tips here..."
              : "Chat disabled - no AI available"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          disabled={!hasAI}
        />
        <button onClick={handleSend} disabled={!input.trim() || !hasAI}>
          Send
        </button>
      </div>

      {/* SMART HELP BUTTONS - Only show if AI is enabled */}
      {hasAI && (
        <div
          style={{
            padding: "15px",
            borderTop: "1px solid #e0e0e0",
            background: "#f8f9fa",
          }}
        >
          {/* AI Usage Counter */}
          <div
            style={{
              fontSize: "11px",
              color: "#666",
              textAlign: "center",
              marginBottom: "8px",
              padding: "4px",
              background: "white",
              borderRadius: "4px",
            }}
          >
            AI Usage: {aiUsageCount} total attempts
            {currentTaskUsed && (
              <span style={{ color: "#ff9800", fontWeight: "bold" }}>
                {" "}| Current task: 1/1 used
              </span>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
              marginBottom: "10px",
            }}
          >
            {/* Help buttons side by side */}
            <div
              style={{
                gridColumn: "1 / -1",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              {/* Help Task Button */}
              <button
                onClick={() => handleSmartHelp()}
                disabled={!currentGameType || currentTaskUsed}
                style={{
                  padding: "12px",
                  background: currentTaskUsed ? "#ff9800" : currentGameType ? "#2196F3" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: currentGameType && !currentTaskUsed ? "pointer" : "not-allowed",
                  fontWeight: "bold",
                  fontSize: "14px",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <span style={{ fontSize: "18px" }}>🤖</span>
                {currentTaskUsed ? "AI Used (1/1)" : currentGameType ? "Help Task" : "Start task first"}
              </button>

              {/* Help Plan Button */}
              <button
                onClick={handlePlanningHelp}
                style={{
                  padding: "12px",
                  background: "#FF9800",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <span style={{ fontSize: "18px" }}>📊</span>
                Help Plan
              </button>
            </div>

            {/* Individual Task Buttons */}
            <button
              onClick={() => handleSmartHelp("materials")}
              disabled={!currentTask.startsWith("g2") || currentTaskUsed}
              style={{
                padding: "10px",
                background: currentTask.startsWith("g2") && !currentTaskUsed
                  ? "#4CAF50"
                  : currentTaskUsed && currentTask.startsWith("g2")
                  ? "#ff9800"
                  : "#e0e0e0",
                color: currentTask.startsWith("g2") || currentTaskUsed ? "white" : "#999",
                border: "none",
                borderRadius: "6px",
                cursor: currentTask.startsWith("g2") && !currentTaskUsed
                  ? "pointer"
                  : "not-allowed",
                fontWeight: "bold",
                fontSize: "12px",
              }}
            >
              🎯 Materials
            </button>

            <button
              onClick={() => handleSmartHelp("research")}
              disabled={!currentTask.startsWith("g1") || currentTaskUsed}
              style={{
                padding: "10px",
                background: currentTask.startsWith("g1") && !currentTaskUsed
                  ? "#9C27B0"
                  : currentTaskUsed && currentTask.startsWith("g1")
                  ? "#ff9800"
                  : "#e0e0e0",
                color: currentTask.startsWith("g1") || currentTaskUsed ? "white" : "#999",
                border: "none",
                borderRadius: "6px",
                cursor: currentTask.startsWith("g1") && !currentTaskUsed
                  ? "pointer"
                  : "not-allowed",
                fontWeight: "bold",
                fontSize: "12px",
              }}
            >
              📚 Research
            </button>

            <button
              onClick={() => handleSmartHelp("engagement")}
              disabled={!currentTask.startsWith("g3") || currentTaskUsed}
              style={{
                padding: "10px",
                background: currentTask.startsWith("g3") && !currentTaskUsed
                  ? "#f44336"
                  : currentTaskUsed && currentTask.startsWith("g3")
                  ? "#ff9800"
                  : "#e0e0e0",
                color: currentTask.startsWith("g3") || currentTaskUsed ? "white" : "#999",
                border: "none",
                borderRadius: "6px",
                cursor: currentTask.startsWith("g3") && !currentTaskUsed
                  ? "pointer"
                  : "not-allowed",
                fontWeight: "bold",
                fontSize: "12px",
              }}
            >
              ✉️ Engage
            </button>
          </div>

          {/* Help Status Indicator */}
          <div
            style={{
              fontSize: "11px",
              color: "#666",
              textAlign: "center",
              marginBottom: "8px",
              padding: "4px",
              background: "white",
              borderRadius: "4px",
            }}
          >
            {currentGameType ? (
              <span style={{ color: "#4CAF50" }}>✓ AI ready to help</span>
            ) : (
              <span style={{ color: "#999" }}>
                ⏸ Navigate to a task to enable AI help
              </span>
            )}
          </div>
        </div>
      )}

      {/* Show a message if AI is disabled */}
      {!hasAI && (
        <div
          style={{
            padding: "15px",
            borderTop: "1px solid #e0e0e0",
            background: "#f5f5f5",
            textAlign: "center",
            color: "#666",
            fontSize: "14px",
          }}
        >
          <div style={{ marginBottom: "5px" }}>📝 No AI Assistant</div>
          <div style={{ fontSize: "12px" }}>
            Complete tasks using your own judgment
          </div>
        </div>
      )}
    </div>
  );
}

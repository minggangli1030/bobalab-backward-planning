// src/App.jsx - Complete Teaching Simulation Version with Tweaks Applied
import React, { useState, useEffect, useRef } from "react";
import CountingTask from "./components/CountingTask";
import SliderTask from "./components/SliderTask";
import TypingTask from "./components/TypingTask";
import NavTabsEnhanced from "./components/NavTabsEnhanced";
import PracticeMode from "./components/PracticeMode";
import ChatContainer, { aiTaskHelper } from "./components/ChatContainer";
import StudentLogin from "./components/StudentLogin";
import { sessionManager } from "./utils/sessionManager";
import { eventTracker } from "./utils/eventTracker";
import { patternGenerator } from "./utils/patternGenerator";
import { db } from "./firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import "./App.css";
import AdminPage from "./AdminPage";
import GameModeSelector from "./components/GameModeSelector";
import CompletionCodeDisplay from "./components/CompletionCodeDisplay";
import MasterAdmin from "./components/MasterAdmin";
import { qualtricsMessenger } from "./utils/qualtricsMessenger";

// Helper function to calculate Levenshtein distance
function calculateLevenshteinDistance(str1, str2) {
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
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

function App() {
  // Admin mode check (before hooks)
  const urlParams = new URLSearchParams(window.location.search);
  const isAdminMode = urlParams.get("admin") === "berkeley2024";

  // State management
  const [mode, setMode] = useState("landing");
  const [gameMode, setGameMode] = useState(null);
  const [practiceChoice, setPracticeChoice] = useState(null);
  const [currentTab, setCurrentTab] = useState("g2t1"); // Start with materials (slider)
  const [completed, setCompleted] = useState({});
  const [completedLevels, setCompletedLevels] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [globalTimer, setGlobalTimer] = useState(0);
  const [taskStartTimes, setTaskStartTimes] = useState({});
  const [switches, setSwitches] = useState(0);
  const [bonusPrompts, setBonusPrompts] = useState(0);
  const [isInBreak, setIsInBreak] = useState(false);
  const [breakDestination, setBreakDestination] = useState(null);
  const [isOutOfFocus, setIsOutOfFocus] = useState(false);
  const [outOfFocusCountdown, setOutOfFocusCountdown] = useState(30);
  const [isIdle, setIsIdle] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(5);
  const [gameBlocked, setGameBlocked] = useState(false);
  const [pausedTime, setPausedTime] = useState(0);
  const [currentSemester, setCurrentSemester] = useState(1);
  const [totalSemesters] = useState(2);
  const [semesterHistory, setSemesterHistory] = useState([]);
  const [randomSeed, setRandomSeed] = useState(null);
  const [checkpointReached, setCheckpointReached] = useState(false);
  const [checkpointBonus, setCheckpointBonus] = useState(0);
  const [currentPractice, setCurrentPractice] = useState(null);
  const [practiceCompleted, setPracticeCompleted] = useState({
    g2t1: false, // Materials (was slider)
    g1t1: false, // Research (was counting)
    g3t1: false, // Engagement (was typing)
  });

  // NEW: Teaching simulation states
  const [timeLimit, setTimeLimit] = useState(1200); // Default 20 min
  const [timeRemaining, setTimeRemaining] = useState(1200);
  const [studentLearningScore, setStudentLearningScore] = useState(0);
  const [categoryPoints, setCategoryPoints] = useState({
    materials: 0, // Renamed from slider
    research: 0, // Renamed from counting
    engagement: 0, // Renamed from typing
    bonus: 0, // Checkpoint bonuses
  });
  // Track materials points earned at each research level
  // Format: { researchLevel: materialsPoints }
  // e.g., { 0: 10, 1: 5, 2: 8 } means:
  // - 10 materials points earned when research was 0
  // - 5 materials points earned when research was 1
  // - 8 materials points earned when research was 2
  const [materialsAtResearchLevel, setMaterialsAtResearchLevel] = useState({});
  const [taskAttempts, setTaskAttempts] = useState({});
  const [taskPoints, setTaskPoints] = useState({});

  // Refs
  const startTimeRef = useRef(Date.now());
  const timerIntervalRef = useRef(null);
  const pauseStartRef = useRef(null);
  const outOfFocusTimerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const timeRemainingRef = useRef(1200);
  const timeLimitRef = useRef(1200);

  // Helper function to get checkpoint timing for display
  const getCheckpointMinutes = () => {
    const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
    const semesterDurationMs = config.semesterDuration || 1200000; // Default 20 minutes
    const checkpointTimeSeconds = Math.floor(semesterDurationMs / 2000); // Half duration in seconds
    return Math.floor(checkpointTimeSeconds / 60); // Convert to minutes for display
  };

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hasCode = urlParams.has("code") || urlParams.has("c");
        const code = urlParams.get("code") || urlParams.get("c");

        // Special handling for ADMIN-MASTER code
        if (code === "ADMIN-MASTER") {
          sessionStorage.setItem(
            "gameConfig",
            JSON.stringify({
              role: "master_admin",
              section: "master_admin",
              hasAI: false,
              isMasterInterface: true,
              displayName: "Master Administrator",
            })
          );
          setIsLoading(false);
          return;
        }

        // Set up admin gameConfig if admin mode but no gameConfig exists
        if (isAdminMode && !sessionStorage.getItem("gameConfig")) {
          sessionStorage.setItem(
            "gameConfig",
            JSON.stringify({
              role: "admin",
              section: "admin",
              hasAI: true,
              checkpointSemester2: true,
              displayName: "Admin User",
            })
          );
        }

        if (!hasCode) {
          setMode("studentLogin");
          setIsLoading(false);
          return;
        }

        const {
          allowed,
          reason,
          resumeSession,
          newSession,
          code: accessCode,
          codeData,
        } = await sessionManager.checkAccess();

        if (!allowed) {
          setAccessDenied(true);
          setAccessDeniedReason(reason);
          setIsLoading(false);
          return;
        }

        if (resumeSession) {
          setSessionId(resumeSession);
          localStorage.setItem("sessionId", resumeSession);
        } else if (newSession) {
          const id = await sessionManager.createSession(accessCode, codeData);
          setSessionId(id);
        }

        await eventTracker.syncOfflineEvents();
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };

    initSession();
  }, []);

  // Notify Qualtrics when all semesters are complete
  useEffect(() => {
    if (mode === "complete" && currentSemester >= totalSemesters) {
      // Game is fully complete - notify Qualtrics to show next button
      qualtricsMessenger.notifyGameComplete({
        finalScore:
          Math.round(calculateStudentLearning()) + (categoryPoints.bonus || 0),
        totalTime: globalTimer,
        semestersCompleted: currentSemester,
        sessionId: sessionId,
      });
    }
  }, [
    mode,
    currentSemester,
    totalSemesters,
    globalTimer,
    categoryPoints.bonus,
    sessionId,
  ]);

  // Sync game state to localStorage for eventTracker
  useEffect(() => {
    localStorage.setItem("currentTask", currentTab);
  }, [currentTab]);

  useEffect(() => {
    localStorage.setItem("gameMode", JSON.stringify(gameMode));
  }, [gameMode]);

  useEffect(() => {
    localStorage.setItem("currentSemester", currentSemester.toString());
  }, [currentSemester]);

  useEffect(() => {
    localStorage.setItem("totalSemesters", totalSemesters.toString());
  }, [totalSemesters]);

  useEffect(() => {
    localStorage.setItem(
      "completedTasksCount",
      Object.keys(completed).length.toString()
    );
  }, [completed]);

  useEffect(() => {
    localStorage.setItem("completedLevels", completedLevels.toString());
  }, [completedLevels]);

  useEffect(() => {
    localStorage.setItem("totalSwitches", switches.toString());
  }, [switches]);

  useEffect(() => {
    localStorage.setItem("categoryPoints", JSON.stringify(categoryPoints));
  }, [categoryPoints]);

  useEffect(() => {
    localStorage.setItem(
      "studentLearningScore",
      studentLearningScore.toString()
    );
  }, [studentLearningScore]);

  useEffect(() => {
    const allPracticeComplete =
      practiceCompleted.g2t1 &&
      practiceCompleted.g1t1 &&
      practiceCompleted.g3t1;
    localStorage.setItem("practiceCompleted", allPracticeComplete.toString());
  }, [practiceCompleted]);

  // Focus/blur detection with game blocking
  // useEffect(() => {
  //   const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
  //   const isAdmin = config.role === "admin";

  //   // Skip all focus/idle detection for admin
  //   if (isAdmin) {
  //     return;
  //   }

  //   const handleFocus = () => {
  //     if (isOutOfFocus) {
  //       setIsOutOfFocus(false);
  //       setOutOfFocusCountdown(30);
  //       if (outOfFocusTimerRef.current) {
  //         clearInterval(outOfFocusTimerRef.current);
  //         outOfFocusTimerRef.current = null;
  //       }
  //     }
  //   };

  //   const handleBlur = () => {
  //     // Focus/blur detection disabled for now
  //     /*
  //     // Only trigger for students in challenge mode
  //     if (mode === "challenge" && !isAdmin) {
  //       setIsOutOfFocus(true);
  //       let countdown = 30;

  //       outOfFocusTimerRef.current = setInterval(() => {
  //         countdown--;
  //         setOutOfFocusCountdown(countdown);

  //         if (countdown <= 0) {
  //           // Block the game
  //           setGameBlocked(true);
  //           clearInterval(outOfFocusTimerRef.current);

  //           // Log the blocking event
  //           eventTracker.logEvent("game_blocked", {
  //             reason: "out_of_focus",
  //             timestamp: Date.now(),
  //             studentId: config.studentId,
  //             section: config.section,
  //           });

  //           // Update session status in Firebase
  //           const sessionId = localStorage.getItem("sessionId");
  //           if (sessionId && !sessionId.startsWith("offline-")) {
  //             updateDoc(doc(db, "sessions", sessionId), {
  //               status: "blocked",
  //               blockedAt: serverTimestamp(),
  //               blockReason: "out_of_focus",
  //             });
  //           }
  //         }
  //       }, 1000);
  //     }
  //     */
  //   };

  //   // Add idle detection
  //   const handleActivity = () => {
  //     lastActivityRef.current = Date.now();
  //     if (isIdle) {
  //       setIsIdle(false);
  //       setIdleCountdown(5);
  //       if (idleTimerRef.current) {
  //         clearInterval(idleTimerRef.current);
  //         idleTimerRef.current = null;
  //       }
  //     }
  //   };

  //   // Check for idle every 30 seconds (students only)
  //   let idleCheckInterval;
  //   if (!isAdmin) {
  //     idleCheckInterval = setInterval(() => {
  //       if (mode === "challenge" && !isAdmin) {
  //         const timeSinceActivity = Date.now() - lastActivityRef.current;
  //         if (timeSinceActivity > 60000 && !isIdle) {
  //           // 60 seconds of inactivity
  //           setIsIdle(true);
  //           let countdown = 5;

  //           idleTimerRef.current = setInterval(() => {
  //             countdown--;
  //             setIdleCountdown(countdown);

  //             if (countdown <= 0) {
  //               setGameBlocked(true);
  //               clearInterval(idleTimerRef.current);

  //               eventTracker.logEvent("game_blocked", {
  //                 reason: "idle",
  //                 timestamp: Date.now(),
  //                 studentId: config.studentId,
  //                 section: config.section,
  //               });

  //               // Update session status
  //               const sessionId = localStorage.getItem("sessionId");
  //               if (sessionId && !sessionId.startsWith("offline-")) {
  //                 updateDoc(doc(db, "sessions", sessionId), {
  //                   status: "blocked",
  //                   blockedAt: serverTimestamp(),
  //                   blockReason: "idle",
  //                 });
  //               }
  //             }
  //           }, 1000);
  //         }
  //       }
  //     }, 30000);
  //   }

  //   // Prevent refresh for students
  //   const handleBeforeUnload = (e) => {
  //     if (!isAdmin && mode === "challenge") {
  //       e.preventDefault();
  //       e.returnValue =
  //         "⚠️ WARNING: If you leave this page, you CANNOT return to complete your session. Your progress will be permanently lost.";

  //       // Log refresh attempt
  //       eventTracker.logEvent("refresh_attempt", {
  //         timestamp: Date.now(),
  //         studentId: config.studentId,
  //         currentMode: mode,
  //       });
  //     }
  //   };

  //   // Add all event listeners
  //   window.addEventListener("focus", handleFocus);
  //   window.addEventListener("blur", handleBlur);
  //   window.addEventListener("mousemove", handleActivity);
  //   window.addEventListener("keypress", handleActivity);
  //   window.addEventListener("click", handleActivity);
  //   window.addEventListener("beforeunload", handleBeforeUnload);

  //   return () => {
  //     window.removeEventListener("focus", handleFocus);
  //     window.removeEventListener("blur", handleBlur);
  //     window.removeEventListener("mousemove", handleActivity);
  //     window.removeEventListener("keypress", handleActivity);
  //     window.removeEventListener("click", handleActivity);
  //     window.removeEventListener("beforeunload", handleBeforeUnload);

  //     if (idleCheckInterval) clearInterval(idleCheckInterval);
  //     if (outOfFocusTimerRef.current) clearInterval(outOfFocusTimerRef.current);
  //     if (idleTimerRef.current) clearInterval(idleTimerRef.current);
  //   };
  // }, [mode]);

  // Loading screen - MUST come before any other conditional returns
  if (isLoading) {
    return (
      <div
        className="app"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <h2>Loading...</h2>
      </div>
    );
  }

  // Conditional returns after loading check
  // Master Admin interface (highest priority)
  if (window.location.search.includes("master=true")) {
    const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
    if (config.role === "master_admin") {
      return <MasterAdmin />;
    }
  }

  // Admin page (hidden route)
  if (window.location.search.includes("admin=true")) {
    return <AdminPage />;
  }

  const calculateStudentLearning = (
    points = categoryPoints,
    materialsBreakdown = materialsAtResearchLevel
  ) => {
    // Calculate materials score with research multipliers applied only to future points
    let materialsScore = 0;

    // Go through each research level and calculate the materials points with appropriate multiplier
    Object.entries(materialsBreakdown).forEach(([researchLevel, materials]) => {
      const level = parseInt(researchLevel);
      const multiplier = 1 + level * 0.15;
      materialsScore += materials * multiplier;
    });

    // Get accumulated interest from localStorage
    const accumulatedInterest =
      parseFloat(localStorage.getItem("engagementInterest") || "0") || 0;

    const total = materialsScore + accumulatedInterest;

    // Student Learning Points Update with new formula display
    const totalMaterials = points.materials || 0;
    const researchPoints = points.research || 0;
    console.log(
      `📊 STUDENT LEARNING: ${total.toFixed(
        1
      )} pts | Materials: ${totalMaterials} (with sequential multipliers) | Research: ${researchPoints} | Interest: ${accumulatedInterest.toFixed(
        1
      )} = ${total.toFixed(1)}`
    );

    return isNaN(total) ? 0 : total;
  };

  const handleCheckpoint = () => {
    const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");

    // Check if checkpoint is enabled for this student/admin
    const checkpointEnabled =
      currentSemester === 2 && config.checkpointSemester2;

    if (!checkpointEnabled) {
      // No checkpoint for this condition
      return;
    }

    setCheckpointReached(true);

    const studentLearning = calculateStudentLearning();

    // Only check for bonus in semester 2 with checkpoint enabled
    if (studentLearning >= 300) {
      const bonus = 300;
      setCheckpointBonus(bonus);

      setCategoryPoints((prev) => ({
        ...prev,
        bonus: (prev.bonus || 0) + bonus,
      }));
    } else {
      setCheckpointBonus(0);
    }

    // Show checkpoint modal - pause the game
    setIsInBreak(true);
    setBreakDestination("checkpoint");

    // Don't auto-close - wait for user to click continue
  };

  const startTimer = () => {
    const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
    const duration = config.semesterDuration || 1200000;
    const limitInSeconds = Math.floor(duration / 1000);

    setTimeLimit(limitInSeconds);
    setTimeRemaining(limitInSeconds);

    startTimeRef.current = Date.now();

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startTimeRef.current;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);

      setGlobalTimer(elapsedSeconds);

      const remaining = Math.max(0, limitInSeconds - elapsedSeconds);
      setTimeRemaining(remaining);

      // Update session time periodically (every 10 seconds)
      if (
        elapsedSeconds % 10 === 0 &&
        sessionId &&
        !sessionId.startsWith("offline-")
      ) {
        updateDoc(doc(db, "sessions", sessionId), {
          timeElapsed: elapsedSeconds,
          lastUpdated: serverTimestamp(),
        }).catch((err) => console.error("Failed to update session time:", err));
      }

      // Check for checkpoint only if enabled
      const checkpointEnabled =
        currentSemester === 2 && config.checkpointSemester2;

      if (checkpointEnabled) {
        // Dynamic checkpoint time: semester duration / 2
        const semesterDurationMs = config.semesterDuration || 1200000; // Default 20 minutes
        const checkpointTime = Math.floor(semesterDurationMs / 2000); // Half duration in seconds

        if (elapsedSeconds === checkpointTime && !checkpointReached) {
          handleCheckpoint();
        }
      }

      // Check for completion
      if (remaining <= 0) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        handleGameComplete("semester_complete");
      }
    }, 1000);
  };

  // Handle practice choice
  const handlePracticeChoice = (choice) => {
    const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
    const isAdmin = config.role === "admin";

    // Check if all practice tasks are complete (for students)
    const allPracticeComplete =
      practiceCompleted.g2t1 &&
      practiceCompleted.g1t1 &&
      practiceCompleted.g3t1;

    setPracticeChoice(choice);
    eventTracker.logEvent("practice_choice", {
      choice: choice,
    });

    if (choice === "no") {
      if (!isAdmin && !allPracticeComplete) {
        // Students MUST complete practice
        showNotification("You must complete all three practice tasks first!");
        setMode("practice");
      } else {
        // Admin or practice complete
        startMainGame();
      }
    } else {
      setMode("practice");
    }
  };

  const startMainGame = () => {
    if (!randomSeed) {
      const seed = Math.floor(Math.random() * 1000000);
      setRandomSeed(seed);
      patternGenerator.initializeSeed(seed);

      if (sessionId && !sessionId.startsWith("offline-")) {
        updateDoc(doc(db, "sessions", sessionId), {
          randomSeed: seed,
          [`semesterSeeds.semester${currentSemester}`]: seed,
        });
      }
    }

    localStorage.setItem("engagementInterest", "0");
    // Reset teaching points
    setCategoryPoints({ materials: 0, research: 0, engagement: 0, bonus: 0 });
    setMaterialsAtResearchLevel({});

    setMode("challenge");
    setCompleted({});
    setCompletedLevels(0);
    setSwitches(0);
    setBonusPrompts(0);
    setCurrentTab("g2t1"); // Start with materials
    setCheckpointReached(false);

    // Reset teaching points
    setTaskAttempts({});
    setTaskPoints({});

    // Start timer (it will handle time limit setting)
    startTimer();

    setTaskStartTimes({ g2t1: Date.now() });
    eventTracker.setPageStartTime("g2t1");
    eventTracker.logEvent("game_start", {
      practiceCompleted: practiceChoice === "yes",
      timestamp: Date.now(),
      gameMode: gameMode,
      currentSemester: currentSemester,
      totalSemesters: totalSemesters,
      isAdminMode: isAdminMode,
    });
  };

  // Handle task completion
  const handleComplete = async (tabId, data) => {
    lastActivityRef.current = Date.now();

    // New point system based on task type and accuracy
    let points = 0;
    // Map to teaching categories with NEW order
    const category = tabId.startsWith("g1")
      ? "research"
      : tabId.startsWith("g2")
      ? "materials"
      : "engagement";

    // DEBUGGING

    if (category === "materials") {
      // Slider: exact = 2 points, within 1 = 1 point
      // Use points from data if available, otherwise calculate
      if (data.points !== undefined) {
        points = data.points;
      } else {
        const userValue = parseFloat(data.userAnswer || data.userValue || 0);
        const targetValue = parseFloat(
          data.correctAnswer || data.targetValue || 0
        );
        const diff = Math.abs(userValue - targetValue);

        if (diff === 0) points = 2;
        else if (diff <= 1) points = 1;
        else points = 0;
      }
    } else if (category === "research") {
      // Counting: exact = 2 points, within 1 = 1 point
      // Use points from data if available, otherwise calculate
      if (data.points !== undefined) {
        points = data.points;
      } else {
        const userCount = parseInt(data.userAnswer || 0);
        const correctCount = parseInt(data.correctAnswer || 0);
        const diff = Math.abs(userCount - correctCount);

        if (diff === 0) points = 2;
        else if (diff <= 1) points = 1;
        else points = 0;
      }
    } else if (category === "engagement") {
      // Typing: exact = 2 points, one typo = 1 point
      // Use points from data if available, otherwise calculate
      if (data.points !== undefined) {
        points = data.points;
      } else {
        const userText = data.userAnswer || "";
        const correctText = data.correctAnswer || "";

        if (userText === correctText) {
          points = 2;
        } else {
          // Check if only one character difference (Levenshtein distance = 1)
          const distance = calculateLevenshteinDistance(userText, correctText);
          if (distance === 1) points = 1;
          else points = 0;
        }
      }
    }

    // Store raw points for the category
    setCategoryPoints((prev) => {
      const newPoints = {
        ...prev,
        [category]: prev[category] + points,
      };
      console.log(
        `🎯 Updated ${category}: +${points} (total: ${newPoints[category]})`
      );
      return newPoints;
    });

    // Track materials points at current research level
    if (category === "materials" && points > 0) {
      const currentResearchLevel = categoryPoints.research;
      setMaterialsAtResearchLevel((prev) => {
        const existing = prev[currentResearchLevel] || 0;
        return {
          ...prev,
          [currentResearchLevel]: existing + points,
        };
      });
    }

    // Calculate and apply engagement interest after EVERY task completion
    const currentEngagementPoints =
      category === "engagement"
        ? categoryPoints.engagement + points
        : categoryPoints.engagement;
    const engagementInterestRate = 0.0015 * currentEngagementPoints;

    // Calculate current student learning (without interest) for interest calculation
    const newCategoryPoints = {
      ...categoryPoints,
      [category]: categoryPoints[category] + points,
    };

    // Update materials breakdown if needed
    let newMaterialsBreakdown = materialsAtResearchLevel;
    if (category === "materials" && points > 0) {
      const currentResearchLevel = categoryPoints.research;
      const existing = materialsAtResearchLevel[currentResearchLevel] || 0;
      newMaterialsBreakdown = {
        ...materialsAtResearchLevel,
        [currentResearchLevel]: existing + points,
      };
    }

    // Calculate materials score with proper multipliers
    let materialsScore = 0;
    Object.entries(newMaterialsBreakdown).forEach(
      ([researchLevel, materials]) => {
        const level = parseInt(researchLevel);
        const multiplier = 1 + level * 0.15;
        materialsScore += materials * multiplier;
      }
    );

    // Add engagement interest to accumulated interest
    const previousInterest = parseFloat(
      localStorage.getItem("engagementInterest") || "0"
    );
    const newInterest =
      previousInterest + engagementInterestRate * materialsScore;
    localStorage.setItem("engagementInterest", newInterest.toString());

    setTaskPoints((prev) => ({
      ...prev,
      [tabId]: points,
    }));

    setTaskAttempts((prev) => ({
      ...prev,
      [tabId]: (prev[tabId] || 0) + 1,
    }));

    // Calculate the new student learning score
    const finalCategoryPoints = {
      ...categoryPoints,
      [category]: categoryPoints[category] + points,
    };

    const newStudentLearning = calculateStudentLearning(
      finalCategoryPoints,
      newMaterialsBreakdown
    );
    setStudentLearningScore(newStudentLearning);

    // Show detailed feedback with task-specific information
    let feedbackMsg = "";
    if (category === "materials") {
      const diff = Math.abs((data.userValue || 0) - (data.targetValue || 0));
      if (diff === 0) {
        feedbackMsg = "Perfect materials!";
      } else if (diff <= 1) {
        feedbackMsg = `Off by ${diff.toFixed(2)}`;
      } else {
        feedbackMsg = `Off by ${diff.toFixed(2)}`;
      }
    } else if (category === "research") {
      const diff = Math.abs((data.userAnswer || 0) - (data.correctAnswer || 0));
      if (diff === 0) {
        feedbackMsg = "Perfect research!";
      } else if (diff <= 1) {
        feedbackMsg = `Off by ${diff}`;
      } else {
        feedbackMsg = `Off by ${diff}`;
      }
    } else if (category === "engagement") {
      if (points === 2) {
        feedbackMsg = "Perfect engagement!";
      } else if (points === 1) {
        feedbackMsg = "One typo";
      } else {
        feedbackMsg = "Multiple errors";
      }
    }

    showNotification(`${feedbackMsg} | +${points} ${category} pts`);

    setCompleted((prev) => ({ ...prev, [tabId]: true }));
    setCompletedLevels((prev) => prev + 1);
    setBonusPrompts((prev) => prev + 1);

    await eventTracker.trackTaskComplete(
      tabId,
      data.attempts,
      data.totalTime,
      data.accuracy || data.difference || 0
    );

    await eventTracker.logEvent("task_complete", {
      taskId: tabId,
      ...data,
      pointsEarned: points,
      categoryPoints: newCategoryPoints,
      studentLearningScore: newStudentLearning,
      engagementInterest: newInterest,
      completionContext: {
        totalTasksCompleted: Object.keys(completed).length + 1,
        currentGameTime: globalTimer,
        switchesBeforeCompletion: switches,
        bonusPromptsEarned: bonusPrompts + 1,
        timeRemaining: timeRemaining,
      },
    });

    if (sessionId && !sessionId.startsWith("offline-")) {
      await updateDoc(doc(db, "sessions", sessionId), {
        [`completedTasks.${tabId}`]: true,
        [`taskPoints.${tabId}`]: points,
        [`categoryPoints`]: newCategoryPoints,
        studentLearningScore: newStudentLearning,
        engagementInterest: newInterest,
        bonusPrompts: bonusPrompts + 1,
        lastActivity: serverTimestamp(),
      });
    }

    // Auto-advance to next task immediately (no delay to prevent clashing with manual switching)
    // Prevent advance if user already switched
    if (currentTab !== tabId) return;

    const currentGame = tabId[1];
    const currentTaskNum = parseInt(tabId.substring(3)); // Fix parsing for 2-digit numbers

    // Try next task in same game
    if (currentTaskNum < 100) {
      // Updated to 100 tasks
      const nextTask = `g${currentGame}t${currentTaskNum + 1}`;
      if (!completed[nextTask]) {
        handleTabSwitch(nextTask, true);
      }
    }
  };

  // Handle tab switching
  const handleTabSwitch = async (newTab, isAutoAdvance = false) => {
    if (isInBreak) return;

    // Prevent switching to completed tasks
    if (completed[newTab] && !isAutoAdvance) {
      showNotification("Task already completed! Choose a different task.");
      return;
    }

    if (!isAutoAdvance) {
      await eventTracker.logEvent("manual_tab_switch", {
        from: currentTab,
        to: newTab,
        reason: "user_clicked",
      });
    }

    lastActivityRef.current = Date.now();
    if (isIdle) {
      setIsIdle(false);
      setIdleCountdown(5);
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    }

    if (currentTab !== newTab && !isAutoAdvance) {
      setSwitches((prev) => prev + 1);
    }

    await eventTracker.trackPageSwitch(currentTab, newTab, isAutoAdvance);

    if (taskStartTimes[currentTab]) {
      const timeSpent = Date.now() - taskStartTimes[currentTab];
      await eventTracker.logEvent("task_time", {
        taskId: currentTab,
        timeSpent,
        completed: completed[currentTab] || false,
        leftForTask: newTab,
      });
    }

    setCurrentTab(newTab);
    setTaskStartTimes((prev) => ({ ...prev, [newTab]: Date.now() }));
    eventTracker.setPageStartTime(newTab);
  };

  // Show notification
  const showNotification = (message) => {
    const notification = document.createElement("div");
    notification.className = "notification-enter";
    notification.style.cssText =
      "position: fixed; bottom: 20px; left: 20px; background: #2196F3; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000; max-width: 400px;";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.className = "notification-exit";
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 3000);
  };

  // Handle game completion
  const handleGameComplete = async (reason = "semester_complete") => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    const finalTime = Math.floor(
      (Date.now() - startTimeRef.current - pausedTime) / 1000
    );

    const finalStudentLearning = calculateStudentLearning();
    const totalBonus = categoryPoints.bonus || 0;
    const finalScore = Math.round(finalStudentLearning) + totalBonus;

    await eventTracker.logEvent("game_complete", {
      totalTime: finalTime,
      totalSwitches: switches,
      completedTasks: Object.keys(completed).length,
      completedLevels: completedLevels,
      completionReason: reason,
      gameMode: gameMode,
      currentSemester: currentSemester,
      categoryPoints,
      studentLearningScore: finalStudentLearning,
      totalBonus,
      finalScore,
      finalContext: {
        practiceCompleted: practiceChoice === "yes",
        totalPrompts: 3 + bonusPrompts,
        isAdminMode: isAdminMode,
      },
    });

    if (sessionId && !sessionId.startsWith("offline-")) {
      await updateDoc(doc(db, "sessions", sessionId), {
        status: "completed",
        completedAt: serverTimestamp(),
        finalTime,
        timeElapsed: finalTime, // Add timeElapsed field for MasterAdmin compatibility
        totalSwitches: switches,
        completionReason: reason,
        currentSemester: currentSemester,
        finalScore,
        studentLearningScore: finalStudentLearning,
      });
    }

    setMode("complete");
  };

  // Handle practice completion
  const handlePracticeComplete = (taskId, data) => {
    // Check if perfect score
    if (data && data.points && data.points === 2) {
      setPracticeCompleted((prev) => ({ ...prev, [taskId]: true }));
      showNotification("Perfect! Practice task completed.");

      // Return to practice menu
      setTimeout(() => {
        setCurrentPractice(null);
      }, 1500);
    } else {
      const points = data?.points || 0;
      showNotification(
        `Practice requires 100% accuracy. You scored ${
          points === 1 ? "50%" : "0%"
        }. Try again!`
      );

      // Return to menu to retry
      setTimeout(() => {
        setCurrentPractice(null);
      }, 2000);
    }
  };

  // Render current task
  // Render current task
  const renderTask = () => {
    const game = currentTab[1];
    const taskNum = parseInt(currentTab.substring(3));

    // Add isPractice check
    const isPractice = mode === "practice";

    if (game === "1") {
      return (
        <CountingTask
          taskNum={taskNum}
          onComplete={isPractice ? handlePracticeComplete : handleComplete}
          currentTaskId={currentTab}
          isPractice={isPractice}
        />
      );
    }
    if (game === "2") {
      return (
        <SliderTask
          taskNum={taskNum}
          onComplete={isPractice ? handlePracticeComplete : handleComplete}
          currentTaskId={currentTab}
          isPractice={isPractice}
        />
      );
    }
    return (
      <TypingTask
        taskNum={taskNum}
        onComplete={isPractice ? handlePracticeComplete : handleComplete}
        currentTaskId={currentTab}
        isPractice={isPractice}
      />
    );
  };

  // Loading check moved earlier in component

  // Student login screen
  if (mode === "studentLogin") {
    return (
      <StudentLogin
        onLoginSuccess={(code) => {
          window.location.href = `${window.location.origin}?code=${code}`;
        }}
      />
    );
  }

  // Access denied screen
  if (accessDenied) {
    return (
      <div className="app">
        <div
          style={{
            maxWidth: "600px",
            margin: "50px auto",
            padding: "30px",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h2 style={{ color: "#f44336", marginBottom: "20px" }}>
            Access Denied
          </h2>
          <p style={{ fontSize: "18px", marginBottom: "20px" }}>
            {accessDeniedReason}
          </p>
          <div
            style={{
              padding: "15px",
              background: "#ffebee",
              borderRadius: "8px",
              border: "1px solid #f44336",
            }}
          >
            <p style={{ color: "#c62828", margin: 0 }}>
              If you believe this is an error, please contact your instructor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Semester Break Screen
  if (mode === "semesterBreak") {
    const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
    const hasCheckpointNext =
      currentSemester === 2 && config.checkpointSemester2;

    return (
      <div className="app">
        <div
          style={{
            maxWidth: "700px",
            margin: "50px auto",
            padding: "40px",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <h1 style={{ color: "#2196F3", marginBottom: "30px" }}>
            🎉 Semester {currentSemester - 1} Complete!
          </h1>

          <div
            style={{
              background: "#e3f2fd",
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "30px",
              border: "2px solid #2196F3",
            }}
          >
            <h3 style={{ color: "#1976d2", marginBottom: "10px" }}>
              Take a Break!
            </h3>
            <p style={{ fontSize: "16px", color: "#666", marginBottom: "0" }}>
              Great job completing Semester {currentSemester - 1}! Take a moment
              to rest your eyes, stretch, or grab some water before continuing.
            </p>
          </div>

          {/* Show checkpoint info only if they have it enabled */}
          {hasCheckpointNext && (
            <div
              style={{
                background: "linear-gradient(135deg, #fff3cd 0%, #ffebee 100%)",
                padding: "25px",
                borderRadius: "8px",
                marginBottom: "30px",
                border: "2px solid #ff9800",
              }}
            >
              <h3 style={{ color: "#f57c00", marginBottom: "15px" }}>
                📚 Midterm Checkpoint Coming!
              </h3>
              <div
                style={{ fontSize: "16px", color: "#666", textAlign: "left" }}
              >
                <p style={{ marginBottom: "10px" }}>
                  <strong>
                    Semester 2 includes a midterm exam at the{" "}
                    {getCheckpointMinutes()}-minute mark!
                  </strong>
                </p>
                <ul style={{ marginLeft: "20px", marginBottom: "10px" }}>
                  <li>Your students will be tested at the midpoint</li>
                  <li>
                    If student learning ≥ 300 points:{" "}
                    <strong>+300 bonus points!</strong>
                  </li>
                  <li>
                    Build up your teaching effectiveness early to maximize the
                    bonus
                  </li>
                </ul>
                <p
                  style={{
                    background: "white",
                    padding: "10px",
                    borderRadius: "4px",
                    textAlign: "center",
                    fontWeight: "bold",
                    color: "#f57c00",
                  }}
                >
                  Goal: Reach 300+ Student Learning by minute{" "}
                  {getCheckpointMinutes()}
                </p>
              </div>
            </div>
          )}

          {/* Previous semester summary */}
          {semesterHistory.length > 0 && (
            <div
              style={{
                background: "#f5f5f5",
                padding: "20px",
                borderRadius: "8px",
                marginBottom: "30px",
              }}
            >
              <h4 style={{ color: "#666", marginBottom: "10px" }}>
                Your Performance So Far:
              </h4>
              {semesterHistory.map((semester, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: "8px",
                    fontSize: "16px",
                  }}
                >
                  Semester {idx + 1}:{" "}
                  <strong>{semester.finalScore} points</strong>
                </div>
              ))}
            </div>
          )}

          {/* Ready button */}
          <div style={{ marginTop: "30px" }}>
            <button
              onClick={() => {
                // Start the next semester
                setMode("challenge");
                startTimer();
                setTaskStartTimes({ g2t1: Date.now() });
                eventTracker.setPageStartTime("g2t1");
                eventTracker.logEvent("semester_start", {
                  semester: currentSemester,
                  timestamp: Date.now(),
                  hasCheckpoint: hasCheckpointNext,
                });
              }}
              style={{
                padding: "15px 40px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                transition: "all 0.3s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.15)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
              }}
            >
              I'm Ready - Start Semester {currentSemester}
            </button>

            <p
              style={{
                marginTop: "15px",
                fontSize: "14px",
                color: "#999",
              }}
            >
              Click when you're ready to continue. The timer will start
              immediately.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Landing page with warning

  // Landing page with warning
  if (mode === "landing") {
    if (!gameMode) {
      setGameMode({ accuracy: "lenient", limit: "time" });
    }

    const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
    const isAdmin = config.role === "admin";

    return (
      <div className="app">
        <div className="landing-container">
          <div
            className="landing-card"
            style={{ padding: "40px", maxWidth: "900px" }}
          >
            <h1
              style={{
                color: "#333",
                marginBottom: "30px",
                fontSize: "32px",
                textAlign: "left",
              }}
            >
              Can you beat Park? - Semester {currentSemester}/{totalSemesters}
            </h1>

            <div className="game-info" style={{ textAlign: "left" }}>
              <div
                style={{
                  marginBottom: "35px",
                  textAlign: "left",
                }}
              >
                <h3
                  style={{
                    color: "#f44336",
                    fontSize: "20px",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>✉️</span> Engagement
                </h3>
                <p
                  style={{
                    marginLeft: "34px",
                    fontSize: "16px",
                    lineHeight: "1.6",
                    color: "#555",
                  }}
                >
                  Build interest that compounds! Each point adds 0.15% interest
                  after every task completion.
                </p>
              </div>

              <div
                style={{
                  marginBottom: "35px",
                  textAlign: "left",
                }}
              >
                <h3
                  style={{
                    color: "#9C27B0",
                    fontSize: "20px",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>📚</span> Research
                </h3>
                <p
                  style={{
                    marginLeft: "34px",
                    fontSize: "16px",
                    lineHeight: "1.6",
                    color: "#555",
                  }}
                >
                  Research amplifies your FUTURE materials! Each point adds +15%
                  multiplier to materials earned after the research (order
                  matters!).
                </p>
              </div>

              <div
                style={{
                  marginBottom: "35px",
                  textAlign: "left",
                }}
              >
                <h3
                  style={{
                    color: "#4CAF50",
                    fontSize: "20px",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>🎯</span> Materials
                </h3>
                <p
                  style={{
                    marginLeft: "34px",
                    fontSize: "16px",
                    lineHeight: "1.6",
                    color: "#555",
                  }}
                >
                  Create teaching materials - each point directly contributes to
                  your goal points!
                </p>
              </div>

              <div
                style={{
                  background: "#f0f8ff",
                  borderRadius: "8px",
                  padding: "25px",
                  marginBottom: "30px",
                  border: "2px solid #2196F3",
                }}
              >
                <h3
                  style={{
                    color: "#2196F3",
                    fontSize: "20px",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>📊</span> Student Learning
                  Formula
                </h3>
                <div
                  style={{
                    background: "white",
                    padding: "18px",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "18px",
                    textAlign: "center",
                    marginBottom: "20px",
                    border: "1px solid #e0e0e0",
                    lineHeight: "1.8",
                  }}
                >
                  Goal ={" "}
                  <strong>
                    Materials × (1 + Research×0.15) + Engagement Interest
                  </strong>
                  <br />
                  <div
                    style={{
                      fontSize: "14px",
                      marginTop: "10px",
                      fontFamily: "sans-serif",
                    }}
                  >
                    Research multipliers apply only to materials earned{" "}
                    <em>after</em> the research
                  </div>
                </div>
                <ul
                  style={{
                    color: "#333",
                    lineHeight: "2",
                    margin: "0",
                    paddingLeft: "25px",
                    fontSize: "15px",
                    textAlign: "left",
                  }}
                >
                  <li>
                    <strong>Scoring:</strong> Exact = 2 pts | Within 1 = 1 pt |
                    Otherwise = 0 pts
                  </li>
                  <li>
                    <strong>Timing:</strong> Task completion order affects your
                    final score
                  </li>
                  <li>
                    <strong>Strategy:</strong> Think carefully about when to
                    complete each task type!
                  </li>
                  {currentSemester === 2 && (
                    <li>
                      At minute {getCheckpointMinutes()}: Exam checkpoint with
                      bonus opportunity (300+ Student Learning = 300 bonus)
                    </li>
                  )}
                </ul>
              </div>

              {/* Only show AI assistance for Section 2 students (who have AI) */}
              {config.hasAI && (
                <div
                  style={{
                    background: "#fff3cd",
                    borderRadius: "6px",
                    padding: "15px",
                    marginBottom: "20px",
                    border: "1px solid #ffc107",
                  }}
                >
                  <h3
                    style={{
                      color: "#856404",
                      fontSize: "16px",
                      marginBottom: "10px",
                    }}
                  >
                    AI Assistant Available:
                  </h3>
                  <ul
                    style={{
                      color: "#856404",
                      lineHeight: "1.6",
                      margin: "0",
                      paddingLeft: "20px",
                      fontSize: "14px",
                    }}
                  >
                    <li>
                      Click the help buttons below each task for AI assistance
                    </li>
                    <li>Unlimited use but reliability varies</li>
                    <li>
                      Type "strategy" or "order" in chat for strategic advice!
                    </li>
                  </ul>
                </div>
              )}

              {/* Semester 2 warning */}
              {currentSemester === 2 && (
                <div
                  style={{
                    background: "#fff3cd",
                    borderRadius: "6px",
                    padding: "15px",
                    marginBottom: "20px",
                    border: "2px solid #ffc107",
                  }}
                >
                  <h3
                    style={{
                      color: "#856404",
                      fontSize: "16px",
                      marginBottom: "10px",
                    }}
                  >
                    📚 Semester 2: Midterm Checkpoint!
                  </h3>
                  <p style={{ color: "#856404", fontSize: "14px", margin: 0 }}>
                    At the {getCheckpointMinutes()}-minute mark, if you have
                    300+ student learning points, you'll earn a 300-point bonus!
                  </p>
                </div>
              )}
            </div>

            {/* Critical Warning for Students */}
            {!isAdmin && (
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",
                  borderRadius: "12px",
                  padding: "20px",
                  marginTop: "20px",
                  marginBottom: "20px",
                  border: "2px solid #d32f2f",
                  boxShadow: "0 4px 6px rgba(211, 47, 47, 0.1)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>⚠️</span>
                  <h3
                    style={{
                      color: "#b71c1c",
                      margin: 0,
                      fontSize: "18px",
                      fontWeight: "600",
                    }}
                  >
                    ONE ATTEMPT ONLY - NO RESTART
                  </h3>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ color: "#d32f2f", fontSize: "18px" }}>
                      ❌
                    </span>
                    <span style={{ fontSize: "14px", color: "#c62828" }}>
                      <strong>No refresh/close</strong> - Session ends
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ color: "#d32f2f", fontSize: "18px" }}>
                      ❌
                    </span>
                    <span style={{ fontSize: "14px", color: "#c62828" }}>
                      <strong>No tab switching</strong> - 30s warning
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: "white",
                    padding: "10px",
                    borderRadius: "6px",
                    textAlign: "center",
                    fontSize: "14px",
                    color: "#b71c1c",
                    fontWeight: "600",
                  }}
                >
                  ⏰ Ensure 40 minutes uninterrupted before starting
                </div>
              </div>
            )}

            <button
              className="start-button"
              onClick={() => setMode("practiceChoice")}
            >
              Start Semester {currentSemester}
            </button>

            {isAdminMode && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "10px",
                  background: "#ffcccb",
                  borderRadius: "6px",
                  border: "2px solid #ff0000",
                  fontWeight: "bold",
                  color: "#d00",
                }}
              >
                ADMIN MODE: {timeLimit / 60} minute timer, checkpoint at{" "}
                {getCheckpointMinutes()}
                minute
              </div>
            )}

            {semesterHistory.length > 0 && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  background: "#e3f2fd",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              >
                <strong>Previous Semesters:</strong>
                {semesterHistory.map((semester, idx) => (
                  <div key={idx} style={{ marginTop: "5px" }}>
                    Semester {idx + 1}: {semester.finalScore} points
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Practice choice
  if (mode === "practiceChoice") {
    const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
    const isAdmin = config.role === "admin";

    return (
      <div className="app">
        <div className="landing-container">
          <div className="landing-card">
            <h2 style={{ color: "#333", marginBottom: "20px" }}>
              {isAdmin
                ? "Practice Mode (Optional for Admin)"
                : "Practice Mode (Required)"}
            </h2>
            <p style={{ color: "#666", marginBottom: "20px" }}>
              {isAdmin
                ? "As an admin, you can skip practice or try it first."
                : "You must complete all three practice tasks before starting the main game."}
            </p>
            <p
              style={{
                color: "#888",
                fontSize: "14px",
                marginBottom: "30px",
                fontStyle: "italic",
              }}
            >
              Practice lets you try each teaching task without time pressure.
            </p>

            {!isAdmin && (
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "20px",
                  border: "2px solid #1976d2",
                  boxShadow: "0 4px 6px rgba(25, 118, 210, 0.1)",
                }}
              >
                <h4
                  style={{
                    color: "#0d47a1",
                    margin: "0 0 16px 0",
                    fontSize: "18px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>📋</span>
                  Required Practice Tasks (100% accuracy needed):
                </h4>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: practiceCompleted.g2t1 ? "#e8f5e9" : "white",
                      borderRadius: "8px",
                      border: `1px solid ${
                        practiceCompleted.g2t1 ? "#4CAF50" : "#e0e0e0"
                      }`,
                    }}
                  >
                    <span style={{ fontSize: "24px", marginRight: "12px" }}>
                      🎯
                    </span>
                    <span
                      style={{ flex: 1, fontSize: "15px", color: "#424242" }}
                    >
                      <strong>Materials</strong>
                    </span>
                    {practiceCompleted.g2t1 ? (
                      <span
                        style={{
                          color: "#4CAF50",
                          fontSize: "20px",
                          fontWeight: "bold",
                        }}
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        style={{
                          background: "#fff3cd",
                          color: "#f57c00",
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        PENDING
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: practiceCompleted.g1t1 ? "#e8f5e9" : "white",
                      borderRadius: "8px",
                      border: `1px solid ${
                        practiceCompleted.g1t1 ? "#4CAF50" : "#e0e0e0"
                      }`,
                    }}
                  >
                    <span style={{ fontSize: "24px", marginRight: "12px" }}>
                      📚
                    </span>
                    <span
                      style={{ flex: 1, fontSize: "15px", color: "#424242" }}
                    >
                      <strong>Research</strong>
                    </span>
                    {practiceCompleted.g1t1 ? (
                      <span
                        style={{
                          color: "#4CAF50",
                          fontSize: "20px",
                          fontWeight: "bold",
                        }}
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        style={{
                          background: "#fff3cd",
                          color: "#f57c00",
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        PENDING
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: practiceCompleted.g3t1 ? "#e8f5e9" : "white",
                      borderRadius: "8px",
                      border: `1px solid ${
                        practiceCompleted.g3t1 ? "#4CAF50" : "#e0e0e0"
                      }`,
                    }}
                  >
                    <span style={{ fontSize: "24px", marginRight: "12px" }}>
                      ✉️
                    </span>
                    <span
                      style={{ flex: 1, fontSize: "15px", color: "#424242" }}
                    >
                      <strong>Engagement</strong>
                    </span>
                    {practiceCompleted.g3t1 ? (
                      <span
                        style={{
                          color: "#4CAF50",
                          fontSize: "20px",
                          fontWeight: "bold",
                        }}
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        style={{
                          background: "#fff3cd",
                          color: "#f57c00",
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        PENDING
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.8)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "#0d47a1",
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  💡 Each task must be completed perfectly to proceed
                </div>
              </div>
            )}

            <div
              style={{ display: "flex", gap: "20px", justifyContent: "center" }}
            >
              <button
                onClick={() => handlePracticeChoice("yes")}
                style={{
                  padding: "15px 30px",
                  background: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                {isAdmin ? "Try Practice Mode" : "Start Required Practice"}
              </button>
              {isAdmin && (
                <button
                  onClick={() => handlePracticeChoice("no")}
                  style={{
                    padding: "15px 30px",
                    background: "#2196F3",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  Skip Practice (Admin)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Practice mode
  // Practice mode
  if (mode === "practice") {
    const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
    const isAdmin = config.role === "admin";

    // If no current practice task selected, show practice menu
    if (!currentPractice) {
      return (
        <div className="app">
          <h1>Teaching Simulation - Practice Mode</h1>
          <PracticeMode
            practiceCompleted={practiceCompleted}
            onPracticeComplete={handlePracticeComplete}
            onSelectPractice={setCurrentPractice} // Make sure this is here
            onStartMainGame={() => {
              const allComplete =
                practiceCompleted.g2t1 &&
                practiceCompleted.g1t1 &&
                practiceCompleted.g3t1;

              if (!isAdmin && !allComplete) {
                showNotification(
                  "You must complete all three practice tasks first!"
                );
              } else {
                startMainGame();
              }
            }}
            isAdmin={isAdmin}
          />
        </div>
      );
    }

    // Render the selected practice task
    const game = currentPractice[1];
    const taskNum = 1; // Always use task 1 for practice

    return (
      <div className="app">
        <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
          <button
            onClick={() => setCurrentPractice(null)}
            style={{
              marginBottom: "20px",
              padding: "10px 20px",
              background: "#666",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
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
            <strong>Practice Mode:</strong> 100% accuracy required. Will
            auto-return after completion.
          </div>

          {game === "1" && (
            <CountingTask
              taskNum={taskNum}
              onComplete={handlePracticeComplete}
              currentTaskId={currentPractice}
              isPractice={true}
            />
          )}
          {game === "2" && (
            <SliderTask
              taskNum={taskNum}
              onComplete={handlePracticeComplete}
              currentTaskId={currentPractice}
              isPractice={true}
            />
          )}
          {game === "3" && (
            <TypingTask
              taskNum={taskNum}
              onComplete={handlePracticeComplete}
              currentTaskId={currentPractice}
              isPractice={true}
            />
          )}
        </div>
      </div>
    );
  }

  // Completion screen
  if (mode === "complete") {
    const minutes = Math.floor(globalTimer / 60);
    const seconds = globalTimer % 60;
    const finalStudentLearning = Math.round(calculateStudentLearning());
    const totalBonus = categoryPoints.bonus || 0;
    const finalScore = finalStudentLearning + totalBonus;

    const semesterData = {
      semester: currentSemester,
      totalTime: globalTimer,
      completedLevels: completedLevels,
      categoryPoints,
      switches,
      gameMode,
      randomSeed,
      studentLearningScore: finalStudentLearning,
      finalScore,
    };

    const handleNextSemester = async () => {
      const newHistory = [...semesterHistory, semesterData];
      setSemesterHistory(newHistory);
      localStorage.setItem("engagementInterest", "0");
      setCategoryPoints({ materials: 0, research: 0, engagement: 0, bonus: 0 });
      setMaterialsAtResearchLevel({});

      if (sessionId && !sessionId.startsWith("offline-")) {
        await updateDoc(doc(db, "sessions", sessionId), {
          [`semesterHistory.semester${currentSemester}`]: semesterData,
          currentSemester: currentSemester + 1,
          lastActivity: serverTimestamp(),
        });
      }

      setCurrentSemester(currentSemester + 1);

      // Reset AI help usage for new semester
      aiTaskHelper.resetForNewSemester();

      // Go to semester break page instead of directly starting
      setMode("semesterBreak");

      // Reset everything for next semester
      setCompleted({});
      setCompletedLevels(0);
      setSwitches(0);
      setBonusPrompts(0);
      setGlobalTimer(0);
      setPausedTime(0);
      setCurrentTab("g2t1"); // Start with materials
      setCheckpointReached(false);

      const newSeed = Math.floor(Math.random() * 1000000);
      setRandomSeed(newSeed);
      patternGenerator.initializeSeed(newSeed);
    };

    const isLastSemester = currentSemester >= totalSemesters;

    return (
      <div className="app">
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
          {/* Semester indicator */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "20px",
              padding: "15px",
              background: "#e3f2fd",
              borderRadius: "8px",
              border: "2px solid #2196F3",
            }}
          >
            <h2 style={{ color: "#2196F3", margin: 0 }}>
              Semester {currentSemester} of {totalSemesters} Complete!
            </h2>
          </div>

          {/* Show completion code only on last semester */}
          {isLastSemester && (
            <CompletionCodeDisplay
              sessionId={sessionId}
              completedLevels={completedLevels}
              totalTime={globalTimer}
              gameMode={gameMode}
            />
          )}

          {/* Performance Summary */}
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              marginTop: "20px",
            }}
          >
            <h2 style={{ color: "#333", marginBottom: "20px" }}>
              📊 Semester {currentSemester} Performance
            </h2>

            {/* Final Score */}
            <div
              style={{
                fontSize: "36px",
                fontWeight: "bold",
                color: "#2196F3",
                marginBottom: "30px",
              }}
            >
              Final Score: {finalScore} points
            </div>

            {/* Student Learning Breakdown */}
            <div
              style={{
                background: "#e3f2fd",
                padding: "20px",
                borderRadius: "8px",
                marginBottom: "30px",
                border: "2px solid #2196F3",
              }}
            >
              <h3 style={{ margin: "0 0 15px 0", color: "#1976d2" }}>
                Student Learning Score: {finalStudentLearning}
              </h3>
              <div style={{ fontSize: "16px", color: "#666" }}>
                = {categoryPoints.materials || 0} (Materials) ×{" "}
                {(1 + (categoryPoints.research || 0) * 0.15).toFixed(2)}{" "}
                (Research)
                {parseFloat(localStorage.getItem("engagementInterest") || "0") >
                  0 &&
                  ` + ${parseFloat(
                    localStorage.getItem("engagementInterest") || "0"
                  ).toFixed(2)} (Interest)`}
              </div>
              {totalBonus > 0 && (
                <div
                  style={{
                    marginTop: "10px",
                    fontSize: "16px",
                    color: "#1976d2",
                  }}
                >
                  + {totalBonus} Checkpoint Bonus
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "15px",
                marginBottom: "30px",
              }}
            >
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "20px",
                  borderRadius: "8px",
                  border: "2px solid #e0e0e0",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    marginBottom: "5px",
                  }}
                >
                  Total Time
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  {minutes}m {seconds}s
                </div>
              </div>

              <div
                style={{
                  background: "#f8f9fa",
                  padding: "20px",
                  borderRadius: "8px",
                  border: "2px solid #e0e0e0",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    marginBottom: "5px",
                  }}
                >
                  Student Learning
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  {finalStudentLearning}
                </div>
              </div>

              {/* Only show checkpoint bonus in semester 2 or if bonus exists */}
              {(currentSemester === 2 || totalBonus > 0) && (
                <div
                  style={{
                    background: "#f8f9fa",
                    padding: "20px",
                    borderRadius: "8px",
                    border: "2px solid #e0e0e0",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#666",
                      marginBottom: "5px",
                    }}
                  >
                    Checkpoint Bonus
                  </div>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#333",
                    }}
                  >
                    +{totalBonus}
                  </div>
                </div>
              )}

              <div
                style={{
                  background: "#f8f9fa",
                  padding: "20px",
                  borderRadius: "8px",
                  border: "2px solid #e0e0e0",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    marginBottom: "5px",
                  }}
                >
                  Tasks Completed
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  {completedLevels}
                </div>
              </div>
            </div>

            {/* Teaching Performance Breakdown */}
            <h3 style={{ color: "#666", marginBottom: "15px" }}>
              Teaching Performance by Category
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "15px",
                marginBottom: "30px",
              }}
            >
              <div
                style={{
                  background: "#f0f8f0",
                  padding: "15px",
                  borderRadius: "6px",
                  border: "2px solid #4CAF5020",
                }}
              >
                <div
                  style={{
                    color: "#4CAF50",
                    fontWeight: "bold",
                    marginBottom: "5px",
                  }}
                >
                  🎯 Materials
                </div>
                <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                  {categoryPoints.materials || 0}
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  Base points
                </div>
              </div>

              <div
                style={{
                  background: "#f8f0ff",
                  padding: "15px",
                  borderRadius: "6px",
                  border: "2px solid #9C27B020",
                }}
              >
                <div
                  style={{
                    color: "#9C27B0",
                    fontWeight: "bold",
                    marginBottom: "5px",
                  }}
                >
                  📚 Research
                </div>
                <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                  {categoryPoints.research || 0}
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  +{(categoryPoints.research || 0) * 15}% to future materials
                </div>
              </div>

              <div
                style={{
                  background: "#fff0f0",
                  padding: "15px",
                  borderRadius: "6px",
                  border: "2px solid #f4433620",
                }}
              >
                <div
                  style={{
                    color: "#f44336",
                    fontWeight: "bold",
                    marginBottom: "5px",
                  }}
                >
                  ✉️ Engagement
                </div>
                <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                  {categoryPoints.engagement || 0}
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  +{((categoryPoints.engagement || 0) * 0.15).toFixed(1)}%
                  interest/task
                </div>
              </div>
            </div>
          </div>

          {/* Checkpoint Bonus Display - Only show in semester 2 if bonus earned */}
          {currentSemester === 2 && categoryPoints.bonus > 0 && (
            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                background: "#fff3cd",
                borderRadius: "6px",
                border: "1px solid #ffc107",
              }}
            >
              <strong style={{ color: "#856404" }}>
                📚 Exam Season Bonus:{" "}
              </strong>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#856404",
                }}
              >
                +{categoryPoints.bonus} points
              </span>
            </div>
          )}

          {/* Semester history */}
          {semesterHistory.length > 0 && (
            <div
              style={{
                marginTop: "30px",
                padding: "20px",
                background: "#f8f9fa",
                borderRadius: "8px",
              }}
            >
              <h4 style={{ color: "#666", marginBottom: "15px" }}>
                Progress Over Semesters
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                  gap: "10px",
                }}
              >
                {[...semesterHistory, semesterData].map((semester, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px",
                      background:
                        idx === semesterHistory.length ? "#e3f2fd" : "white",
                      borderRadius: "6px",
                      border: "1px solid #e0e0e0",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      Semester {idx + 1}
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: "#333",
                      }}
                    >
                      {semester.finalScore}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Next semester or finish button */}
        <div style={{ marginTop: "30px", textAlign: "center" }}>
          {!isLastSemester ? (
            <button
              onClick={handleNextSemester}
              style={{
                padding: "15px 40px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              }}
            >
              Start Semester {currentSemester + 1} →
            </button>
          ) : (
            <div
              style={{
                padding: "20px",
                background: "#fff3cd",
                border: "2px solid #ffc107",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <h3 style={{ color: "#856404", marginBottom: "10px" }}>
                ⚠️ All semesters complete!
              </h3>
              <p style={{ color: "#856404", marginBottom: "0" }}>
                Return to the Qualtrics survey and enter your completion code to
                finish the study.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main challenge mode
  return (
    <div className="app">
      {/* Checkpoint Modal */}
      {isInBreak && breakDestination === "checkpoint" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.8)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "12px",
              textAlign: "center",
              maxWidth: "700px",
              width: "90%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <h2
              style={{
                color: "#4CAF50",
                marginBottom: "25px",
                fontSize: "28px",
              }}
            >
              📚 Midterm Exam Results!
            </h2>

            <div
              style={{
                fontSize: "18px",
                marginBottom: "25px",
                padding: "20px",
                background: "#f8f9fa",
                borderRadius: "8px",
              }}
            >
              <p style={{ marginBottom: "15px" }}>
                The midterm exam has arrived! Let's see how your students
                performed...
              </p>

              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1976d2",
                  padding: "15px",
                  background: "white",
                  borderRadius: "6px",
                  margin: "15px 0",
                }}
              >
                Student Learning Score: {Math.round(calculateStudentLearning())}{" "}
                pts
              </div>
            </div>

            {/* Teaching breakdown */}
            <div
              style={{
                marginBottom: "25px",
                padding: "20px",
                background: "#e3f2fd",
                borderRadius: "8px",
                textAlign: "left",
              }}
            >
              <h3 style={{ marginBottom: "15px", textAlign: "center" }}>
                Your Teaching Performance:
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    padding: "10px",
                    background: "white",
                    borderRadius: "6px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#4CAF50", fontWeight: "bold" }}>
                    Materials
                  </div>
                  <div style={{ fontSize: "20px" }}>
                    {categoryPoints.materials} pts
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px",
                    background: "white",
                    borderRadius: "6px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#9C27B0", fontWeight: "bold" }}>
                    Research
                  </div>
                  <div style={{ fontSize: "20px" }}>
                    {categoryPoints.research} pts
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    ×{(1 + categoryPoints.research * 0.15).toFixed(2)}
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px",
                    background: "white",
                    borderRadius: "6px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#f44336", fontWeight: "bold" }}>
                    Engagement
                  </div>
                  <div style={{ fontSize: "20px" }}>
                    {categoryPoints.engagement} pts
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    +{(categoryPoints.engagement * 0.15).toFixed(1)}% interest
                  </div>
                </div>
              </div>
            </div>

            {/* Bonus result */}
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                padding: "20px",
                borderRadius: "8px",
                marginBottom: "25px",
                background:
                  checkpointBonus > 0
                    ? "linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%)"
                    : "linear-gradient(135deg, #fff3cd 0%, #ffe082 100%)",
                border: `2px solid ${
                  checkpointBonus > 0 ? "#4CAF50" : "#ff9800"
                }`,
                color: checkpointBonus > 0 ? "#2e7d32" : "#f57c00",
              }}
            >
              {currentSemester === 2 ? (
                checkpointBonus > 0 ? (
                  <>
                    🎉 Excellent Teaching! +{checkpointBonus} bonus points
                    earned!
                  </>
                ) : (
                  <>
                    📚 Goal was 300+ points (you had{" "}
                    {Math.round(calculateStudentLearning())}). Keep teaching!
                  </>
                )
              ) : (
                <>Checkpoint reached! Keep going!</>
              )}
            </div>

            {/* Tips for remainder */}
            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                background: "#f5f5f5",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#666",
                textAlign: "left",
              }}
            >
              <strong>Tips for the rest of the semester:</strong>
              <ul style={{ margin: "10px 0 0 20px", lineHeight: "1.6" }}>
                <li>
                  You have about {getCheckpointMinutes()} minutes remaining
                </li>
                <li>Focus on accuracy - every point counts!</li>
                <li>
                  Research multiplies everything, Engagement compounds over time
                </li>
                <li>Materials give direct points - use them strategically</li>
              </ul>
            </div>

            {/* Continue button */}
            <button
              onClick={() => {
                setIsInBreak(false);
                setBreakDestination(null);
              }}
              style={{
                padding: "12px 35px",
                background: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 3px 6px rgba(0,0,0,0.15)",
                transition: "all 0.3s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 5px 10px rgba(0,0,0,0.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 3px 6px rgba(0,0,0,0.15)";
              }}
            >
              Continue Teaching →
            </button>

            <p
              style={{
                marginTop: "10px",
                color: "#999",
                fontSize: "12px",
              }}
            >
              The timer is paused. Click to continue when ready.
            </p>
          </div>
        </div>
      )}

      {/* Game blocked overlay */}
      {gameBlocked && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.9)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "10px",
              textAlign: "center",
              maxWidth: "500px",
            }}
          >
            <h2 style={{ color: "#f44336", marginBottom: "20px" }}>
              Session Ended
            </h2>
            <p style={{ marginBottom: "30px" }}>
              Your session has been terminated due to inactivity or switching
              away from the game.
            </p>
            <p style={{ color: "#c62828", fontWeight: "bold" }}>
              You cannot restart. This was your only attempt.
            </p>
          </div>
        </div>
      )}

      {/* Out of focus warning */}
      {isOutOfFocus && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "#ff9800",
            color: "white",
            padding: "15px 20px",
            borderRadius: "8px",
            zIndex: 10000,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          <strong>⚠️ Focus Warning</strong>
          <br />
          Game will be blocked in {outOfFocusCountdown} seconds
        </div>
      )}

      {/* Idle warning - DISABLED */}
      {/* {isIdle && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.7)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "10px",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            <h3 style={{ color: "#ff9800", marginBottom: "15px" }}>
              Are you still there?
            </h3>
            <p style={{ marginBottom: "20px" }}>
              Auto-closing in {idleCountdown} seconds due to inactivity
            </p>
            <button
              onClick={() => {
                setIsIdle(false);
                setIdleCountdown(5);
                lastActivityRef.current = Date.now();
              }}
              style={{
                padding: "10px 20px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Continue Playing
            </button>
          </div>
        </div>
      )} */}

      <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "30px", textAlign: "center" }}>
          Can you beat Park? - Semester {currentSemester}/{totalSemesters}
        </h1>

        {/* Use NavTabsEnhanced with updated category names */}
        <NavTabsEnhanced
          current={currentTab}
          completed={completed}
          onSwitch={handleTabSwitch}
          limitMode="time"
          taskPoints={taskPoints}
          categoryMultipliers={{}}
          starGoals={{}}
          categoryPoints={categoryPoints}
          timeRemaining={timeRemaining}
        />

        {/* Side-by-side layout: Game + Chat */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            alignItems: "stretch",
            marginTop: "20px",
            minHeight: "650px",
            width: "100%",
          }}
        >
          {/* Game area - 2/3 width */}
          <div
            style={{
              flex: "0 0 66.666%",
              minHeight: "650px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "white",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              overflow: "visible",
            }}
          >
            <div
              className="task-container"
              style={{
                width: "100%",
                minHeight: "650px",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "visible",
              }}
            >
              {renderTask()}
            </div>
          </div>

          {/* Chat area - 1/3 width */}
          <div
            style={{
              flex: "0 0 33.333%",
              background: "white",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              overflow: "visible" /* Changed from hidden to visible */,
              height: "680px" /* Increased height slightly */,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <ChatContainer
              bonusPrompts={bonusPrompts}
              currentTask={currentTab}
              categoryPoints={categoryPoints}
              categoryMultipliers={{}}
              starGoals={{}}
              timeRemaining={timeRemaining}
              calculateStudentLearning={calculateStudentLearning}
              onAIHelp={(helpData) => {
                // Pass AI help to the current task
                window.dispatchEvent(
                  new CustomEvent("aiHelp", { detail: helpData })
                );
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

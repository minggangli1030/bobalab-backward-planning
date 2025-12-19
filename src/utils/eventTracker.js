// Core fixes for the main tracking issues
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

// Store pending events for offline sync
const pendingEvents = [];

export const eventTracker = {
  // Initialize session properly when module loads
  init() {
    if (!localStorage.getItem("sessionId")) {
      localStorage.setItem("sessionId", this.generateSessionId());
      localStorage.setItem("sessionStartTime", Date.now().toString());
    }
    // Initialize semester time if not set
    if (!localStorage.getItem("semesterStartTime")) {
      localStorage.setItem("semesterStartTime", Date.now().toString());
    }
    
    // Set up beforeunload handler to save pending events
    window.addEventListener("beforeunload", () => {
      this.flushPendingEvents();
    });
    
    // Also save on pagehide (more reliable than beforeunload)
    window.addEventListener("pagehide", () => {
      this.flushPendingEvents();
    });
  },
  
  // Flush pending events to Firestore
  async flushPendingEvents() {
    if (pendingEvents.length === 0) return;
    
    const eventsToFlush = [...pendingEvents];
    pendingEvents.length = 0; // Clear array
    
    // Try to save all pending events
    for (const event of eventsToFlush) {
      try {
        await addDoc(collection(db, "events"), event);
      } catch (error) {
        console.error("Failed to flush pending event:", error);
        // Re-add to pending if save failed
        pendingEvents.push(event);
      }
    }
  },

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Core event logging function - FIXED
  async logEvent(eventType, eventData) {
    const sessionId =
      localStorage.getItem("sessionId") || this.generateSessionId();
    const sessionStartTime = parseInt(
      localStorage.getItem("sessionStartTime") || Date.now()
    );
    const currentTime = Date.now();
    const timeElapsed = currentTime - sessionStartTime;

    // Format time in seconds with 1 decimal
    const timeElapsedSeconds = (timeElapsed / 1000).toFixed(1);

    // Format readable timestamp (mm:ss)
    const minutes = Math.floor(timeElapsed / 60000);
    const seconds = Math.floor((timeElapsed % 60000) / 1000);
    const readableTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    // Get full game context from localStorage/sessionStorage
    const gameConfig = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
    const gameContext = this.getFullGameContext();
    const globalConfig = JSON.parse(localStorage.getItem("globalConfig") || "{}");

    const event = {
      sessionId,
      studentId: gameConfig.studentId || null, // CRITICAL: Always include studentId from gameConfig
      username: gameConfig.displayName || gameConfig.username || gameConfig.studentId || null, // Include username/displayName
      type: eventType,
      timestamp: new Date().toISOString(), // Always ISO format
      clientTimestamp: currentTime, // Keep as milliseconds for consistency
      timeElapsedSeconds: parseFloat(timeElapsedSeconds), // Time since session start in seconds
      readableTime,
      semesterTime: this.getSemesterTime(),
      // Add full context to every event
      ...gameContext,
      // Add config data
      isAdminMode: gameConfig.role === "admin",
      hasCheckpoint: gameConfig.checkpointSemester2 || false,
      hasAI: gameConfig.hasAI || false,
      section: gameConfig.section || null, // Include section info
      // Add ALL globalConfig settings for complete tracking
      gameConfig: {
        semesterDuration: globalConfig.semesterDuration || 12,
        totalTasks: globalConfig.totalTasks || 10,
        totalSemesters: globalConfig.totalSemesters || 2,
        midtermEnabled: globalConfig.midtermEnabled || false,
        aiCost: globalConfig.aiCost || 0,
        wrongAnswerPenalty: globalConfig.wrongAnswerPenalty || 0,
        switchCost: globalConfig.switchCost || 0,
        jarRefillFreezeTime: globalConfig.jarRefillFreezeTime || 0,
        unfinishedJarPenalty: globalConfig.unfinishedJarPenalty || 0,
        unfinishedTaskPenalty: globalConfig.unfinishedTaskPenalty || 0,
        aiDelay: globalConfig.aiDelay || 0,
        taskOrderStrategy: globalConfig.taskOrderStrategy || "sequential_task",
        difficultyMode: globalConfig.difficultyMode || "fixed",
        gameMode: globalConfig.gameMode || "knapsack",
        scoring: globalConfig.scoring || null, // Full scoring configuration
      },
      // Event-specific data goes last to allow overrides
      ...this.convertTimesToSeconds(eventData), // Convert all time fields to seconds
      // REMOVED: userAgent and screenResolution
    };

    // DEBUG: Log studentId to verify it's being set correctly
    if (eventType === 'user_action' || eventType === 'task_attempt') {
      console.log(`DEBUG: Event ${eventType} - studentId: ${event.studentId}, role: ${gameConfig.role}`);
    }

    try {
      // Try to save immediately (non-blocking)
      addDoc(collection(db, "events"), event).catch((error) => {
        console.error("Failed to log event immediately:", error);
        // Store in pending events for retry
        pendingEvents.push(event);
        this.storeOfflineEvent(event);
      });
    } catch (error) {
      console.error("Failed to log event:", error);
      // Store in pending events for retry
      pendingEvents.push(event);
      this.storeOfflineEvent(event);
    }
  },

  // Convert all time fields to seconds with 1 decimal
  convertTimesToSeconds(data) {
    const converted = { ...data };
    const timeFields = [
      "timeTaken",
      "timeSpent",
      "totalTime",
      "timeOnPreviousPage",
      "averageTime",
      "timeBetweenHelpAndSubmit",
    ];

    for (const field of timeFields) {
      if (converted[field] !== undefined && converted[field] !== null) {
        // Assume input is in milliseconds, convert to seconds
        converted[`${field}Seconds`] = (converted[field] / 1000).toFixed(1);
        delete converted[field]; // Remove the millisecond version
      }
    }

    // Handle arrays of times
    if (converted.timeProgression) {
      converted.timeProgressionSeconds = converted.timeProgression.map((t) =>
        (t / 1000).toFixed(1)
      );
      delete converted.timeProgression;
    }

    if (converted.timePerAttempt) {
      converted.timePerAttemptSeconds = converted.timePerAttempt.map((t) =>
        (t / 1000).toFixed(1)
      );
      delete converted.timePerAttempt;
    }

    return converted;
  },

  // Fixed semester time calculation
  getSemesterTime() {
    const semesterStartTime = parseInt(
      localStorage.getItem("semesterStartTime") || Date.now()
    );
    const elapsed = Date.now() - semesterStartTime;
    const elapsedSeconds = (elapsed / 1000).toFixed(1);
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    return {
      elapsedSeconds: parseFloat(elapsedSeconds),
      readable: `${minutes}:${seconds.toString().padStart(2, "0")}`,
      minutes,
      seconds,
    };
  },

  // Fixed context tracking with proper session duration
  getCurrentContext() {
    const sessionStartTime = parseInt(
      localStorage.getItem("sessionStartTime") || Date.now()
    );
    const sessionDurationSeconds = (
      (Date.now() - sessionStartTime) /
      1000
    ).toFixed(1);

    return {
      currentTask: localStorage.getItem("currentTask"),
      gameMode: localStorage.getItem("gameMode"),
      totalCompleted: this.getCompletedTaskCount(),
      currentStreak: this.getCurrentStreak(),
      sessionDurationSeconds: parseFloat(sessionDurationSeconds),
    };
  },

  // Get full game context for every event
  getFullGameContext() {
    // Try to get from localStorage as fallback
    const currentTask = localStorage.getItem("currentTask") || "";
    const gameMode = localStorage.getItem("gameMode") || "";
    const currentSemester = parseInt(localStorage.getItem("currentSemester") || "1");
    const totalSemesters = parseInt(localStorage.getItem("totalSemesters") || "2");
    const practiceCompleted = localStorage.getItem("practiceCompleted") === "true";
    const completedTasks = parseInt(localStorage.getItem("completedTasksCount") || "0");
    const completedLevels = parseInt(localStorage.getItem("completedLevels") || "0");
    const totalSwitches = parseInt(localStorage.getItem("totalSwitches") || "0");
    const aiUsageCount = parseInt(localStorage.getItem("aiUsageCount") || "0");
    
    // Get category points
    const categoryPoints = JSON.parse(localStorage.getItem("categoryPoints") || "{}");
    const studentLearning = parseFloat(localStorage.getItem("studentLearningScore") || "0");
    
    return {
      currentTask,
      gameMode,
      currentSemester,
      totalSemesters,
      practiceCompleted,
      completedTasks,
      completedLevels,
      totalSwitches,
      aiUsageCount,
      studentLearning,
      totalBonus: categoryPoints.bonus || 0,
      finalScore: Math.round(studentLearning) + (categoryPoints.bonus || 0),
      semester: currentSemester, // Duplicate for compatibility
    };
  },

  // Fixed improvement trend calculation - needs at least 3 data points
  calculateImprovementTrend(history) {
    if (!history || history.length < 3) {
      return "needs_more_data"; // Changed from "insufficient_data" for clarity
    }

    const recentHistory = history.slice(-5); // Last 5 attempts
    const accuracies = recentHistory.map((h) => h.accuracy);
    const trend = this.calculateTrend(accuracies);

    if (trend > 5) return "rapid_improvement";
    if (trend > 2) return "steady_improvement";
    if (trend > 0) return "slight_improvement";
    if (trend > -2) return "stable";
    if (trend > -5) return "slight_decline";
    return "rapid_decline";
  },

  // Fixed improvement rate to handle small datasets
  calculateImprovementRate(history) {
    if (!history || history.length < 2) {
      return {
        overall: 0,
        trend: 0,
        isImproving: false,
        dataPoints: history ? history.length : 0,
      };
    }

    const firstAccuracy = history[0].accuracy;
    const lastAccuracy = history[history.length - 1].accuracy;
    const improvement = lastAccuracy - firstAccuracy;

    // Only calculate trend if we have enough data
    if (history.length < 3) {
      return {
        overall: improvement,
        trend: improvement, // Simple difference for 2 points
        isImproving: improvement > 0,
        dataPoints: history.length,
      };
    }

    // For 3+ points, calculate proper trend
    const midPoint = Math.floor(history.length / 2);
    const firstHalfAvg =
      history.slice(0, midPoint).reduce((sum, h) => sum + h.accuracy, 0) /
      midPoint;
    const secondHalfAvg =
      history.slice(midPoint).reduce((sum, h) => sum + h.accuracy, 0) /
      (history.length - midPoint);
    const trend = secondHalfAvg - firstHalfAvg;

    return {
      overall: improvement,
      trend: trend,
      isImproving: trend > 0,
      dataPoints: history.length,
    };
  },

  // Ensure time tracking is properly initialized
  setPageStartTime(pageId) {
    if (!pageId) return;
    localStorage.setItem(`pageStartTime_${pageId}`, Date.now().toString());
  },

  getTimeOnCurrentPage(pageId) {
    if (!pageId) return 0;
    const startTime = localStorage.getItem(`pageStartTime_${pageId}`);
    return startTime ? Date.now() - parseInt(startTime) : 0;
  },

  // Helper to ensure session is always initialized
  ensureSession() {
    if (!localStorage.getItem("sessionId")) {
      this.init();
    }
  },

  // Missing methods that are being called
  async trackAIHelpResponse(taskId, helpType, suggestion, playerAction, playerValue, timeBetween) {
    // Update AI usage count
    const currentCount = parseInt(localStorage.getItem("aiUsageCount") || "0");
    localStorage.setItem("aiUsageCount", (currentCount + 1).toString());
    
    return this.logEvent("ai_help_response", {
      taskId,
      helpType,
      suggestion,
      playerAction,
      playerValue,
      timeBetween,
    });
  },

  async trackTaskAttempt(taskId, data) {
    return this.logEvent("task_attempt", {
      taskId,
      ...data,
    });
  },

  async trackUserAction(action, data) {
    return this.logEvent("user_action", {
      action,
      response: data.response || "",
      query: data.query || "",
      queryType: data.queryType || "",
      choice: data.choice || "",
      currentMode: data.currentMode || "",
      ...data,
    });
  },

  async syncOfflineEvents() {
    // Placeholder for offline sync functionality
    console.log("Syncing offline events...");
    return Promise.resolve();
  },

  async trackTaskComplete(taskId, data) {
    return this.logEvent("task_complete", {
      taskId,
      ...data,
    });
  },

  async trackPageSwitch(from, to, isAutoAdvance) {
    return this.logEvent("page_switch", {
      from,
      to,
      isAutoAdvance,
    });
  },

  trackAITaskHelp(currentTask, taskType, suggestion, wasCorrect, attemptNumber) {
    return this.logEvent("ai_task_help", {
      taskId: currentTask,
      taskType,
      suggestion,
      wasCorrect,
      attemptNumber,
    });
  },

  // Store event offline for later sync
  storeOfflineEvent(event) {
    try {
      const offlineEvents = JSON.parse(localStorage.getItem("offlineEvents") || "[]");
      offlineEvents.push(event);
      // Keep only last 1000 events to avoid localStorage overflow
      if (offlineEvents.length > 1000) {
        offlineEvents.shift();
      }
      localStorage.setItem("offlineEvents", JSON.stringify(offlineEvents));
    } catch (error) {
      console.error("Failed to store offline event:", error);
    }
  },
};

// Auto-initialize when module loads
eventTracker.init();

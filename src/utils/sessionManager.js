// src/utils/sessionManager.js - Fixed with daily limits and refresh prevention
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { codeVerification } from "./codeVerification";

export const sessionManager = {
  // Check if student already played today
  async checkDailyLimit(studentId) {
    if (!studentId) return { allowed: true };

    // Get today's date at midnight (PST/PDT)
    const now = new Date();
    const todayMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );

    try {
      // DISABLED: Daily refresh access feature
      // Admin refresh functionality has been disabled

      // Check for existing sessions today
      const sessionsRef = collection(db, "sessions");
      const q = query(
        sessionsRef,
        where("studentId", "==", studentId),
        where("startTime", ">=", todayMidnight)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Check if they have a refresh record AFTER their session
        const latestSession = querySnapshot.docs[0].data();
        const sessionTime = latestSession.startTime?.toDate
          ? latestSession.startTime.toDate()
          : new Date(latestSession.clientStartTime);

        // DISABLED: Refresh after session check
        // No longer checking for admin-granted refresh access

        // No refresh - they already played
        return {
          allowed: false,
          reason: "daily_limit",
          existingSession: latestSession,
          nextAvailable: new Date(
            todayMidnight.getTime() + 24 * 60 * 60 * 1000
          ),
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error("Error checking daily limit:", error);

      // Fallback to localStorage check
      const localKey = `played_${studentId}_${
        todayMidnight.toISOString().split("T")[0]
      }`;
      if (localStorage.getItem(localKey)) {
        return {
          allowed: false,
          reason: "daily_limit",
          nextAvailable: new Date(
            todayMidnight.getTime() + 24 * 60 * 60 * 1000
          ),
        };
      }

      return { allowed: true };
    }
  },

  // Store that student played today
  async markDailyPlay(studentId) {
    const now = new Date();
    const todayMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );

    // Store in localStorage as backup
    const localKey = `played_${studentId}_${
      todayMidnight.toISOString().split("T")[0]
    }`;
    localStorage.setItem(localKey, "true");

    // Clean up old localStorage entries (older than 7 days)
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("played_")) {
        const dateStr = key.split("_")[2];
        if (dateStr && new Date(dateStr) < cutoffDate) {
          localStorage.removeItem(key);
        }
      }
    }
  },

  async checkAccess() {
    try {
      // Get the code from URL
      const urlCode = codeVerification.getCodeFromURL();

      // No code = need to login
      if (!urlCode) {
        return {
          allowed: false,
          reason: "Please login with your student ID",
          requiresCode: true,
        };
      }

      // Check if we have game config from StudentLogin
      const gameConfig = JSON.parse(
        sessionStorage.getItem("gameConfig") || "{}"
      );

      // Check if admin (admins bypass all restrictions)
      const isAdmin = gameConfig.role === "admin" || gameConfig.role === "master_admin";

      if (!isAdmin && gameConfig.studentId) {
        // Check daily limit for students (with refresh support)
        const dailyCheck = await this.checkDailyLimit(gameConfig.studentId);

        if (!dailyCheck.allowed && !dailyCheck.refreshGranted) {
          const nextAvailable = dailyCheck.nextAvailable;
          const hoursUntil = Math.ceil(
            (nextAvailable - Date.now()) / (1000 * 60 * 60)
          );

          return {
            allowed: false,
            reason: `You have already completed today's session. Please come back in ${hoursUntil} hours (after midnight).`,
            dailyLimitReached: true,
            nextAvailable: nextAvailable,
          };
        }

        // Check for refresh attempts (non-admin)
        const existingSessionId = sessionStorage.getItem("activeSessionId");
        if (existingSessionId) {
          // They're trying to refresh - block it
          return {
            allowed: false,
            reason:
              "Page refresh is not allowed during the game. Your session has been terminated.",
            refreshAttempt: true,
          };
        }
      }

      // CASE 1: Valid login
      if (gameConfig.studentId) {

        // Mark that they're playing today (for students only)
        if (!isAdmin) {
          await this.markDailyPlay(gameConfig.studentId);
        }

        return {
          allowed: true,
          newSession: true,
          code: urlCode,
          codeData: {
            status: "new",
            metadata: gameConfig,
          },
          isAdmin: isAdmin,
        };
      }

      // CASE 2: No game config
      return {
        allowed: false,
        reason: "Please login with your Berkeley student ID",
        requiresCode: true,
      };
    } catch (error) {
      console.error("Error in checkAccess:", error);

      const gameConfig = JSON.parse(
        sessionStorage.getItem("gameConfig") || "{}"
      );

      // If admin, allow anyway
      if (gameConfig.role === "admin") {
        return {
          allowed: true,
          newSession: true,
          code: codeVerification.getCodeFromURL(),
          codeData: {
            status: "error_bypass",
            metadata: gameConfig,
          },
          isAdmin: true,
        };
      }

      return {
        allowed: false,
        reason: "System error. Please try again.",
        requiresCode: true,
      };
    }
  },

  async createSession(accessCode = null, codeData = null, isPractice = false) {
    try {
      const gameConfig = JSON.parse(
        sessionStorage.getItem("gameConfig") || "{}"
      );

      const isAdmin = gameConfig.role === "admin" || gameConfig.role === "master_admin";

      // Create session in Firebase
      const sessionData = {
        id: crypto.randomUUID(),
        accessCode,
        studentId: gameConfig.studentId || null,
        role: gameConfig.role || "student",
        semesterDuration: gameConfig.semesterDuration || 720000,
        displayName: gameConfig.displayName || "Student",
        startTime: serverTimestamp(),
        clientStartTime: new Date().toISOString(),
        status: "active",
        completedTasks: {},
        isPractice: isPractice,
        isAdminSession: isAdmin,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        section: gameConfig.section,
        hasAI: gameConfig.hasAI,
        checkpointSemester2: gameConfig.checkpointSemester2,
      };

      const docRef = await addDoc(collection(db, "sessions"), sessionData);
      const sessionId = docRef.id;

      // Store session ID in both localStorage and sessionStorage
      localStorage.setItem("sessionId", sessionId);
      sessionStorage.setItem("activeSessionId", sessionId);

      // Set up anti-refresh handler for students
      if (!isAdmin) {
        window.addEventListener("beforeunload", (e) => {
          // Prevent refresh for students
          e.preventDefault();
          e.returnValue = "Your progress will be lost if you leave this page.";

          // Mark session as abandoned if they leave anyway
          this.handleSessionAbandonment();
        });

        // Detect page visibility changes
        document.addEventListener("visibilitychange", () => {
          if (!isAdmin && document.hidden) {
            // Student switched tabs - log it
            // eventTracker.logEvent("tab_switch", {
            //   sessionId: sessionId,
            //   timestamp: Date.now(),
            //   hidden: true,
            // });
          }
        });
      }

      return sessionId;
    } catch (error) {
      console.error("Error creating session:", error);

      // Offline fallback (only for admins)
      const gameConfig = JSON.parse(
        sessionStorage.getItem("gameConfig") || "{}"
      );

      if (gameConfig.role === "admin") {
        const offlineId = "offline-" + Date.now();
        localStorage.setItem("sessionId", offlineId);
        sessionStorage.setItem("activeSessionId", offlineId);

        const sessionData = {
          id: offlineId,
          accessCode,
          startTime: Date.now(),
          status: "active",
          isOffline: true,
          studentId: gameConfig.studentId || null,
          role: gameConfig.role || "admin",
        };
        localStorage.setItem("offlineSession", JSON.stringify(sessionData));

        return offlineId;
      }

      throw error; // Students must have online session
    }
  },

  async handleSessionAbandonment() {
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId && !sessionId.startsWith("offline-")) {
      try {
        await updateDoc(doc(db, "sessions", sessionId), {
          status: "abandoned",
          abandonedAt: serverTimestamp(),
          abandonReason: "page_unload",
        });
      } catch (error) {
        console.error("Error marking session as abandoned:", error);
      }
    }

    // Clear session storage to prevent re-entry
    sessionStorage.removeItem("activeSessionId");
    sessionStorage.removeItem("gameConfig");
  },
};

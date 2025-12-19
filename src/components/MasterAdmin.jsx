// src/components/MasterAdmin.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  setDoc,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function MasterAdmin({ onClose }) {
  const [activeTab, setActiveTab] = useState("config");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Game Configuration State
  const [gameConfig, setGameConfig] = useState({
    semesterDuration: 12,
    totalTasks: 10,
    totalSemesters: 2,
    midtermEnabled: true,
    aiCost: 0,
    wrongAnswerPenalty: 2,
    switchCost: 0,
    jarRefillFreezeTime: 0,
    unfinishedJarPenalty: 0,
    aiDelay: 0,
    taskOrderStrategy: "sequential_task",
    difficultyMode: "fixed",
    // Scoring configuration: 3 tasks × 3 difficulties × 2 scores = 18 variables
    scoring: {
      g1: {
        // Research (Counting)
        easy: { fullCorrect: 2, halfCorrect: 1 },
        medium: { fullCorrect: 2, halfCorrect: 1 },
        hard: { fullCorrect: 2, halfCorrect: 1 },
      },
      g2: {
        // Materials (Slider)
        easy: { fullCorrect: 2, halfCorrect: 1 },
        medium: { fullCorrect: 2, halfCorrect: 1 },
        hard: { fullCorrect: 2, halfCorrect: 1 },
      },
      g3: {
        // Engagement (Typing)
        easy: { fullCorrect: 2, halfCorrect: 1 },
        medium: { fullCorrect: 2, halfCorrect: 1 },
        hard: { fullCorrect: 2, halfCorrect: 1 },
      },
    },
  });
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadGameConfig();
    fetchStudents();
  }, []);

  const [previousGameConfig, setPreviousGameConfig] = useState(null);

  const loadGameConfig = async () => {
    try {
      const docRef = doc(db, "game_settings", "global");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const loadedConfig = { ...gameConfig, ...docSnap.data() };
        setGameConfig(loadedConfig);
        setPreviousGameConfig(loadedConfig); // Store previous config for change tracking
      }
    } catch (error) {
      console.error("Error loading game config:", error);
    }
  };

  const saveGameConfig = async () => {
    setSavingConfig(true);
    try {
      const docRef = doc(db, "game_settings", "global");
      const docSnap = await getDoc(docRef);
      const oldConfig = docSnap.exists() ? docSnap.data() : {};

      // Calculate what changed
      const changes = {};
      Object.keys(gameConfig).forEach((key) => {
        if (
          JSON.stringify(oldConfig[key]) !== JSON.stringify(gameConfig[key])
        ) {
          changes[key] = {
            from: oldConfig[key],
            to: gameConfig[key],
          };
        }
      });

      // Save new config
      await setDoc(docRef, gameConfig, { merge: true });

      // Log the change to a changes collection
      if (Object.keys(changes).length > 0) {
        try {
          const changesRef = collection(db, "game_settings_changes");
          await addDoc(changesRef, {
            timestamp: new Date().toISOString(),
            changedAt: serverTimestamp(),
            changes: changes,
            changedBy: "master_admin", // Could be enhanced to track actual admin user
            previousConfig: oldConfig,
            newConfig: gameConfig,
          });
        } catch (error) {
          console.error("Error logging config changes:", error);
        }
      }

      setPreviousGameConfig({ ...gameConfig });
      alert("Configuration saved successfully!");
    } catch (error) {
      console.error("Error saving config:", error);
      alert("Failed to save configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleConfigChange = (key, value) => {
    setGameConfig((prev) => ({ ...prev, [key]: value }));
  };

  const [allSessions, setAllSessions] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [gameSettings, setGameSettings] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // 1. Fetch Roster (Students)
      const studentsRef = collection(db, "students");
      const studentSnap = await getDocs(studentsRef);
      const rosterMap = {};

      const studentsData = studentSnap.docs.map((doc) => ({
        id: doc.id, // Unique ID from Firestore
        ...doc.data(),
      }));
      setAllStudents(studentsData);

      studentSnap.docs.forEach((doc) => {
        rosterMap[doc.id] = { id: doc.id, ...doc.data() };
      });

      // 2. Fetch Sessions (Gameplay Data)
      const sessionsRef = collection(db, "sessions");
      // Optional: Query only relevant fields if possible, but for now fetch all to be safe
      const sessionsSnap = await getDocs(sessionsRef);

      // Store all sessions for download with unique ID
      const sessionsData = sessionsSnap.docs.map((doc) => ({
        id: doc.id, // Unique ID from Firestore
        ...doc.data(),
      }));
      setAllSessions(sessionsData);

      // 3. Fetch Events
      const eventsRef = collection(db, "events");
      const eventsSnap = await getDocs(eventsRef);
      const eventsData = eventsSnap.docs.map((doc) => ({
        id: doc.id, // Unique ID from Firestore
        ...doc.data(),
      }));
      setAllEvents(eventsData);

      // 4. Fetch Game Settings
      const settingsRef = doc(db, "game_settings", "global");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setGameSettings({
          id: settingsSnap.id, // Unique ID
          documentId: "global", // Document ID
          ...settingsSnap.data(),
        });
      }

      console.log(
        `Debug: Found ${studentSnap.size} students and ${sessionsSnap.size} sessions`
      );

      // 3. Aggregate Session Data
      // Use displayName or studentIdentifier as the key, fallback to studentId
      // Filter out Firebase document IDs (long random strings like "D1pEPznNGKQkYIGUjoBF")
      const isFirebaseDocId = (id) => {
        if (!id) return false;
        // Firebase document IDs are typically 20 characters, alphanumeric
        // Check if it looks like a Firebase auto-generated ID
        return /^[A-Za-z0-9]{20,}$/.test(id) && id.length >= 20;
      };

      const sessionStats = {}; // username/identifier -> { totalAccesses, scores, hasPlayed, lastPlayed... }

      sessionsSnap.docs.forEach((doc) => {
        const session = doc.data();
        // Use displayName or studentIdentifier first, then studentId
        // But skip if studentId looks like a Firebase document ID
        let sid =
          session.displayName || session.studentIdentifier || session.studentId;

        // Skip if no identifier or if it's a Firebase document ID
        if (!sid || isFirebaseDocId(sid)) {
          // If studentId is a Firebase doc ID but we have displayName, use that
          if (session.displayName && isFirebaseDocId(session.studentId)) {
            sid = session.displayName;
          } else {
            return; // Skip this session
          }
        }

        if (!sessionStats[sid]) {
          sessionStats[sid] = {
            totalAccesses: 0,
            scores: [],
            hasPlayed: false,
            lastPlayed: null, // Track last played time
            // Keep track of latest section/meta if needed for non-roster students
            section: session.section || "Unknown",
            sid: sid,
            displayName: session.displayName || sid, // Store display name
          };
        }

        sessionStats[sid].totalAccesses += 1;

        // Mark as played if they have a completed task or final score
        // Or essentially if they created a session they "played" to some extent
        // But let's check for meaningful progress if desired.
        // For now, any session = hasPlayed: true (matches original intent "Active Sessions")
        sessionStats[sid].hasPlayed = true;

        // Track latest session time
        const sessionTime = session.startTime?.toDate
          ? session.startTime.toDate()
          : new Date(session.clientStartTime || 0);
        if (
          !sessionStats[sid].lastPlayed ||
          sessionTime > sessionStats[sid].lastPlayed
        ) {
          sessionStats[sid].lastPlayed = sessionTime;
        }

        if (session.finalScore !== undefined) {
          sessionStats[sid].scores.push({
            total: session.finalScore,
            learning: session.studentLearningScore,
            timestamp: session.completedAt,
          });
        }
      });

      // 4. Merge Data
      // Filter out Firebase document IDs from roster
      const filteredRosterMap = {};
      Object.keys(rosterMap).forEach((key) => {
        const student = rosterMap[key];
        // Use displayName or studentIdentifier if available, otherwise check if key is a Firebase ID
        const identifier =
          student.displayName ||
          student.studentIdentifier ||
          student.sid ||
          key;
        if (!isFirebaseDocId(identifier)) {
          filteredRosterMap[identifier] = {
            ...student,
            id: identifier,
            sid: identifier,
            displayName: student.displayName || identifier,
          };
        }
      });

      // Start with all Roster students (filtered)
      const mergedData = Object.values(filteredRosterMap).map((student) => {
        const stats =
          sessionStats[student.id] || sessionStats[student.sid] || {};
        return {
          ...student,
          ...stats, // Overwrite stale roster data with fresh session aggregated data
          // Ensure scores is an array
          scores: stats.scores || student.scores || [],
          // Ensure totalAccesses is summed or taken from stats
          totalAccesses: stats.totalAccesses || 0,
          hasPlayed: stats.hasPlayed || false,
          lastPlayed: stats.lastPlayed || null,
          // Use displayName from stats if available
          displayName: stats.displayName || student.displayName || student.id,
        };
      });

      // Add students who are in Sessions but NOT in Roster (e.g. experimental/test users)
      // Filter out Firebase document IDs
      Object.keys(sessionStats).forEach((sid) => {
        if (
          !isFirebaseDocId(sid) &&
          !filteredRosterMap[sid] &&
          !rosterMap[sid]
        ) {
          mergedData.push({
            id: sid,
            sid: sid, // Maintain consistency with table expecting 'sid' field sometimes
            ...sessionStats[sid],
            displayName: sessionStats[sid].displayName || sid,
          });
        }
      });

      // Sort by Last Played (Descending)
      mergedData.sort((a, b) => {
        const timeA = a.lastPlayed ? a.lastPlayed.getTime() : 0;
        const timeB = b.lastPlayed ? b.lastPlayed.getTime() : 0;
        return timeB - timeA;
      });

      setStudents(mergedData);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetAllData = async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset ALL student data? This cannot be undone!"
      )
    ) {
      return;
    }

    setRefreshing(true);
    try {
      const studentsRef = collection(db, "students");
      const querySnapshot = await getDocs(studentsRef);

      for (const docSnapshot of querySnapshot.docs) {
        await setDoc(
          doc(db, "students", docSnapshot.id),
          {
            hasPlayed: false,
            totalAccesses: 0,
            scores: [],
          },
          { merge: true }
        );
      }

      alert("All student data has been reset!");
      await fetchStudents();
    } catch (error) {
      console.error("Error resetting data:", error);
      alert("Failed to reset data");
    } finally {
      setRefreshing(false);
    }
  };

  const downloadData = async () => {
    // Ensure data is loaded
    if (allStudents.length === 0) {
      await fetchStudents();
    }
    // Convert students data to CSV with unique ID
    const headers = [
      "ID", // Unique Firestore document ID
      "Student ID",
      "Section",
      "Has Played",
      "Last Played",
      "Total Accesses",
      "Highest Score",
    ];
    const rows = allStudents
      .filter((s) => !s.section?.includes("ADMIN"))
      .map((student) => {
        const highestScore =
          student.scores && student.scores.length > 0
            ? Math.max(...student.scores.map((s) => s.total || 0))
            : 0;
        return [
          student.id || "", // Unique Firestore ID
          student.sid || student.id || "",
          student.section || "N/A",
          student.hasPlayed ? "Yes" : "No",
          student.lastPlayed
            ? new Date(student.lastPlayed).toLocaleString()
            : "-",
          student.totalAccesses || 0,
          highestScore,
        ];
      });

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `students_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSessionsData = async () => {
    // Ensure data is loaded
    if (allSessions.length === 0) {
      await fetchStudents();
    }
    // Convert sessions data to CSV with unique ID
    const headers = [
      "ID", // Unique Firestore document ID
      "Session ID", // Legacy field (same as ID)
      "Student ID",
      "Section",
      "Start Time",
      "Status",
      "Final Score",
      "Student Learning Score",
      "Completed Tasks",
      "Random Seed",
    ];
    const rows = allSessions.map((session) => {
      const startTime = session.startTime?.toDate
        ? session.startTime.toDate().toLocaleString()
        : session.clientStartTime
        ? new Date(session.clientStartTime).toLocaleString()
        : "-";

      const completedTasks = session.completedTasks
        ? Object.keys(session.completedTasks).length
        : 0;

      return [
        session.id || "", // Unique Firestore ID
        session.id || "", // Session ID (same as ID for compatibility)
        session.studentId || "",
        session.section || "N/A",
        startTime,
        session.status || "unknown",
        session.finalScore !== undefined ? session.finalScore : "",
        session.studentLearningScore !== undefined
          ? session.studentLearningScore
          : "",
        completedTasks,
        session.randomSeed || "",
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `sessions_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadEventsData = async () => {
    // Ensure data is loaded
    if (allEvents.length === 0) {
      await fetchStudents();
    }
    // Convert events data to CSV with unique ID
    // Flatten nested objects for CSV compatibility
    const headers = [
      "ID", // Unique Firestore document ID
      "Session ID",
      "Student ID",
      "Username",
      "Type",
      "Timestamp",
      "Client Timestamp",
      "Time Elapsed Seconds",
      "Readable Time",
      "Current Task",
      "Game Mode",
      "Current Semester",
      "Total Switches",
      "AI Usage Count",
      "Student Learning Score",
      "Total Score",
      "Event Data (JSON)", // Store full event data as JSON string
    ];
    const rows = allEvents.map((event) => {
      // Extract key fields for easy access
      const eventData = { ...event };
      delete eventData.id; // Remove ID from nested data to avoid duplication

      return [
        event.id || "", // Unique Firestore ID
        event.sessionId || "",
        event.studentId || "",
        event.username || "",
        event.type || "",
        event.timestamp || "",
        event.clientTimestamp || "",
        event.timeElapsedSeconds || "",
        event.readableTime || "",
        event.currentTask || "",
        event.gameMode || "",
        event.currentSemester || "",
        event.totalSwitches || "",
        event.aiUsageCount || "",
        event.studentLearning || event.studentLearningScore || "",
        event.totalScore || event.finalScore || "",
        JSON.stringify(eventData), // Full event data as JSON
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const str = String(cell);
            // Escape quotes and newlines
            return `"${str
              .replace(/"/g, '""')
              .replace(/\n/g, "\\n")
              .replace(/\r/g, "\\r")}"`;
          })
          .join(",")
      ),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `events_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadGameSettingsData = async () => {
    // Ensure data is loaded
    if (!gameSettings) {
      await fetchStudents();
      if (!gameSettings) {
        alert("No game settings found!");
        return;
      }
    }

    // Convert game settings to CSV
    const headers = [
      "ID", // Unique Firestore document ID
      "Document ID",
      "Setting Name",
      "Setting Value (JSON)",
    ];

    // Flatten the settings object
    const settingsEntries = Object.entries(gameSettings).filter(
      ([key]) => key !== "id" && key !== "documentId"
    );
    const rows = settingsEntries.map(([key, value]) => [
      gameSettings.id || "", // Unique Firestore ID
      gameSettings.documentId || "global",
      key,
      typeof value === "object" ? JSON.stringify(value) : String(value),
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const str = String(cell);
            return `"${str
              .replace(/"/g, '""')
              .replace(/\n/g, "\\n")
              .replace(/\r/g, "\\r")}"`;
          })
          .join(",")
      ),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `game_settings_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllData = () => {
    // Download all data types sequentially
    downloadData();
    setTimeout(() => downloadSessionsData(), 500);
    setTimeout(() => downloadEventsData(), 1000);
    setTimeout(() => downloadGameSettingsData(), 1500);
  };

  const tabButtonStyle = (isActive) => ({
    padding: "12px 24px",
    background: isActive ? "#2196F3" : "transparent",
    color: isActive ? "white" : "#666",
    border: "none",
    borderBottom: isActive ? "3px solid #2196F3" : "3px solid transparent",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: isActive ? "600" : "normal",
    transition: "all 0.2s",
  });

  const totalStudents = students.filter(
    (s) => !s.section?.includes("ADMIN")
  ).length;
  const playedStudents = students.filter(
    (s) => !s.section?.includes("ADMIN") && s.hasPlayed
  ).length;

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1 style={{ margin: 0, color: "#333" }}>🔐 Master Admin Dashboard</h1>
        <button
          onClick={onClose}
          style={{
            padding: "10px 20px",
            background: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "500",
          }}
        >
          Exit Admin
        </button>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #e0e0e0",
          marginBottom: "30px",
        }}
      >
        <button
          onClick={() => setActiveTab("config")}
          style={tabButtonStyle(activeTab === "config")}
        >
          ⚙️ Game Configuration
        </button>
        <button
          onClick={() => setActiveTab("scoring")}
          style={tabButtonStyle(activeTab === "scoring")}
        >
          🎯 Scoring Configuration
        </button>
        <button
          onClick={() => setActiveTab("players")}
          style={tabButtonStyle(activeTab === "players")}
        >
          👥 Player Data
        </button>
        <button
          onClick={() => setActiveTab("advice")}
          style={tabButtonStyle(activeTab === "advice")}
        >
          💡 Game Advice
        </button>
      </div>

      {/* Game Configuration Tab */}
      {activeTab === "config" && (
        <div>
          {/* Save Button at Top */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px", color: "#333" }}>
              Game Configuration
            </h2>
            <button
              onClick={saveGameConfig}
              disabled={savingConfig}
              style={{
                padding: "10px 24px",
                background: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: savingConfig ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "14px",
                opacity: savingConfig ? 0.6 : 1,
              }}
            >
              {savingConfig ? "Saving..." : "💾 Save Settings"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            {/* Time & Semesters */}
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 15px 0",
                  fontSize: "16px",
                  color: "#555",
                }}
              >
                ⏱️ Time & Semesters
              </h3>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Semester Duration (Minutes)
                </label>
                <input
                  type="number"
                  value={gameConfig.semesterDuration}
                  onChange={(e) =>
                    handleConfigChange(
                      "semesterDuration",
                      parseInt(e.target.value)
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Total Semesters
                </label>
                <input
                  type="number"
                  value={gameConfig.totalSemesters}
                  onChange={(e) =>
                    handleConfigChange(
                      "totalSemesters",
                      parseInt(e.target.value)
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <input
                  type="checkbox"
                  checked={gameConfig.midtermEnabled}
                  onChange={(e) =>
                    handleConfigChange("midtermEnabled", e.target.checked)
                  }
                  id="midtermCheck"
                />
                <label
                  htmlFor="midtermCheck"
                  style={{ fontSize: "13px", cursor: "pointer" }}
                >
                  Enable Midterm Checkpoint
                </label>
              </div>
            </div>

            {/* Task Settings */}
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 15px 0",
                  fontSize: "16px",
                  color: "#555",
                }}
              >
                📋 Task Settings
              </h3>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Total Tasks per Semester
                </label>
                <input
                  type="number"
                  value={gameConfig.totalTasks}
                  onChange={(e) =>
                    handleConfigChange("totalTasks", parseInt(e.target.value))
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Difficulty Configuration
                </label>
                <select
                  value={gameConfig.difficultyMode || "fixed"}
                  onChange={(e) =>
                    handleConfigChange("difficultyMode", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                  }}
                >
                  <option value="fixed">
                    Fixed (50% Easy, 30% Medium, 20% Hard)
                  </option>
                  <option value="manual">
                    Manual (User chooses difficulty)
                  </option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Task Order Strategy
                </label>
                <select
                  value={gameConfig.taskOrderStrategy}
                  onChange={(e) =>
                    handleConfigChange("taskOrderStrategy", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                  }}
                >
                  <option value="sequential_task">
                    Order by Task (Materials → Research → Engagement)
                  </option>
                  <option value="sequential_difficulty">
                    Order by Difficulty (Easy → Medium → Hard)
                  </option>
                </select>
              </div>

              <div style={{ marginTop: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Game Mode
                </label>
                <select
                  value={gameConfig.gameMode || "knapsack"}
                  onChange={(e) =>
                    handleConfigChange("gameMode", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                  }}
                >
                  <option value="knapsack">
                    Knapsack Mode (Allocate tasks upfront, limited tasks)
                  </option>
                  <option value="sequential">
                    Sequential Mode (Infinite levels, countdown timer)
                  </option>
                </select>
                <p
                  style={{ fontSize: "11px", color: "#666", marginTop: "5px" }}
                >
                  Sequential mode: Timer counts down, infinite levels, can keep
                  playing until time runs out.
                </p>
              </div>
            </div>

            {/* Penalties & Mechanics */}
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 15px 0",
                  fontSize: "16px",
                  color: "#555",
                }}
              >
                ⚖️ Penalties & Mechanics
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginBottom: "15px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    Switch Cost (Points)
                  </label>
                  <input
                    type="number"
                    value={gameConfig.switchCost || 0}
                    onChange={(e) =>
                      handleConfigChange("switchCost", parseInt(e.target.value))
                    }
                    style={{
                      width: "100%",
                      padding: "6px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                      fontSize: "13px",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    Refill Freeze (Seconds)
                  </label>
                  <input
                    type="number"
                    value={gameConfig.jarRefillFreezeTime || 0}
                    onChange={(e) =>
                      handleConfigChange(
                        "jarRefillFreezeTime",
                        parseInt(e.target.value)
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "6px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    Unfinished Jar Penalty (Pts)
                  </label>
                  <input
                    type="number"
                    value={gameConfig.unfinishedJarPenalty || 0}
                    onChange={(e) =>
                      handleConfigChange(
                        "unfinishedJarPenalty",
                        parseInt(e.target.value)
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "6px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                      fontSize: "13px",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    AI Delay (Seconds)
                  </label>
                  <input
                    type="number"
                    value={gameConfig.aiDelay || 0}
                    onChange={(e) =>
                      handleConfigChange("aiDelay", parseInt(e.target.value))
                    }
                    style={{
                      width: "100%",
                      padding: "6px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button at Bottom - Remove this section */}
        </div>
      )}

      {/* Scoring Configuration Tab */}
      {activeTab === "scoring" && (
        <div>
          {/* Save Button at Top */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px", color: "#333" }}>
              Scoring Configuration
            </h2>
            <button
              onClick={saveGameConfig}
              disabled={savingConfig}
              style={{
                padding: "10px 24px",
                background: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: savingConfig ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "14px",
                opacity: savingConfig ? 0.6 : 1,
              }}
            >
              {savingConfig ? "Saving..." : "💾 Save Settings"}
            </button>
          </div>

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <p
              style={{ fontSize: "13px", color: "#666", marginBottom: "20px" }}
            >
              Configure points for each task type and difficulty level. "Full
              Correct" = perfect answer, "Half Correct" = partial credit.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "15px",
              }}
            >
              {["g1", "g2", "g3"].map((taskType) => {
                const taskNames = {
                  g1: "Research",
                  g2: "Materials",
                  g3: "Engagement",
                };
                const taskIcons = { g1: "📚", g2: "🎯", g3: "✉️" };
                const taskColors = {
                  g1: "#9C27B0",
                  g2: "#4CAF50",
                  g3: "#f44336",
                };

                return (
                  <div
                    key={taskType}
                    style={{
                      background: "#f9f9f9",
                      padding: "15px",
                      borderRadius: "8px",
                      border: `2px solid ${taskColors[taskType]}`,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "bold",
                        marginBottom: "12px",
                        color: taskColors[taskType],
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "14px",
                      }}
                    >
                      <span>{taskIcons[taskType]}</span>
                      <span>{taskNames[taskType]}</span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "8px",
                      }}
                    >
                      {["easy", "medium", "hard"].map((difficulty) => {
                        const diffLabels = {
                          easy: "E",
                          medium: "M",
                          hard: "H",
                        };
                        return (
                          <div
                            key={difficulty}
                            style={{
                              background: "white",
                              padding: "8px",
                              borderRadius: "4px",
                              border: "1px solid #ddd",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "10px",
                                fontWeight: "600",
                                marginBottom: "6px",
                                color: "#666",
                                textAlign: "center",
                              }}
                            >
                              {diffLabels[difficulty]}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                              }}
                            >
                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    fontSize: "9px",
                                    marginBottom: "2px",
                                    color: "#666",
                                  }}
                                >
                                  Full
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={
                                    gameConfig.scoring?.[taskType]?.[difficulty]
                                      ?.fullCorrect ?? 2
                                  }
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    setGameConfig((prev) => ({
                                      ...prev,
                                      scoring: {
                                        ...prev.scoring,
                                        [taskType]: {
                                          ...prev.scoring?.[taskType],
                                          [difficulty]: {
                                            ...prev.scoring?.[taskType]?.[
                                              difficulty
                                            ],
                                            fullCorrect: value,
                                          },
                                        },
                                      },
                                    }));
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "4px",
                                    borderRadius: "3px",
                                    border: "1px solid #ddd",
                                    fontSize: "12px",
                                  }}
                                />
                              </div>
                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    fontSize: "9px",
                                    marginBottom: "2px",
                                    color: "#666",
                                  }}
                                >
                                  Half
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={
                                    gameConfig.scoring?.[taskType]?.[difficulty]
                                      ?.halfCorrect ?? 1
                                  }
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    setGameConfig((prev) => ({
                                      ...prev,
                                      scoring: {
                                        ...prev.scoring,
                                        [taskType]: {
                                          ...prev.scoring?.[taskType],
                                          [difficulty]: {
                                            ...prev.scoring?.[taskType]?.[
                                              difficulty
                                            ],
                                            halfCorrect: value,
                                          },
                                        },
                                      },
                                    }));
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "4px",
                                    borderRadius: "3px",
                                    border: "1px solid #ddd",
                                    fontSize: "12px",
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Player Data Tab */}
      {activeTab === "players" && (
        <div
          style={{
            background: "white",
            padding: "25px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "18px" }}>Active Sessions</h2>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={downloadAllData}
                style={{
                  padding: "10px 20px",
                  background: "#9C27B0",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                📦 Download All Data
              </button>
              <button
                onClick={downloadData}
                style={{
                  padding: "10px 20px",
                  background: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                  fontSize: "13px",
                }}
              >
                📥 Students
              </button>
              <button
                onClick={downloadSessionsData}
                style={{
                  padding: "10px 20px",
                  background: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                  fontSize: "13px",
                }}
              >
                📥 Sessions
              </button>
              <button
                onClick={downloadEventsData}
                style={{
                  padding: "10px 20px",
                  background: "#FF9800",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                  fontSize: "13px",
                }}
              >
                📥 Events
              </button>
              <button
                onClick={downloadGameSettingsData}
                style={{
                  padding: "10px 20px",
                  background: "#9E9E9E",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                  fontSize: "13px",
                }}
              >
                📥 Settings
              </button>
              <button
                onClick={resetAllData}
                disabled={refreshing}
                style={{
                  padding: "10px 20px",
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: refreshing ? "not-allowed" : "pointer",
                  fontWeight: "500",
                  fontSize: "13px",
                  opacity: refreshing ? 0.6 : 1,
                }}
              >
                {refreshing ? "Processing..." : "🗑️ Reset All Data"}
              </button>
            </div>
          </div>

          <div
            style={{
              marginBottom: "20px",
              padding: "15px",
              background: "#f5f5f5",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "20px",
                textAlign: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#2196F3",
                  }}
                >
                  {totalStudents}
                </div>
                <div style={{ fontSize: "13px", color: "#666" }}>
                  Total Students
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#4CAF50",
                  }}
                >
                  {playedStudents}
                </div>
                <div style={{ fontSize: "13px", color: "#666" }}>
                  Have Played
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#ff9800",
                  }}
                >
                  {totalStudents - playedStudents}
                </div>
                <div style={{ fontSize: "13px", color: "#666" }}>
                  Never Played
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#666" }}
            >
              Loading student data...
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                    <th
                      style={{
                        padding: "12px",
                        borderBottom: "2px solid #ddd",
                        fontSize: "13px",
                      }}
                    >
                      Student ID
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        borderBottom: "2px solid #ddd",
                        fontSize: "13px",
                      }}
                    >
                      Section
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        borderBottom: "2px solid #ddd",
                        fontSize: "13px",
                      }}
                    >
                      Has Played
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        borderBottom: "2px solid #ddd",
                        fontSize: "13px",
                      }}
                    >
                      Last Played
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        borderBottom: "2px solid #ddd",
                        fontSize: "13px",
                      }}
                    >
                      Total Accesses
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        borderBottom: "2px solid #ddd",
                        fontSize: "13px",
                      }}
                    >
                      Highest Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter((s) => !s.section?.includes("ADMIN"))
                    .map((student) => (
                      <tr
                        key={student.id}
                        style={{ borderBottom: "1px solid #eee" }}
                      >
                        <td style={{ padding: "12px", fontSize: "13px" }}>
                          {student.displayName || student.sid || student.id}
                        </td>
                        <td style={{ padding: "12px", fontSize: "13px" }}>
                          {student.section || "N/A"}
                        </td>
                        <td style={{ padding: "12px", fontSize: "13px" }}>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: "12px",
                              background: student.hasPlayed
                                ? "#e8f5e9"
                                : "#f5f5f5",
                              color: student.hasPlayed ? "#4CAF50" : "#999",
                              fontSize: "12px",
                              fontWeight: "500",
                            }}
                          >
                            {student.hasPlayed ? "Yes" : "No"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            fontSize: "13px",
                            color: "#666",
                          }}
                        >
                          {student.lastPlayed
                            ? new Date(student.lastPlayed).toLocaleString()
                            : "-"}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            fontSize: "13px",
                            fontWeight: "600",
                          }}
                        >
                          {student.totalAccesses || 0}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#2196F3",
                          }}
                        >
                          {student.scores && student.scores.length > 0
                            ? Math.max(
                                ...student.scores.map((s) => s.total || 0)
                              )
                            : 0}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Game Advice Tab */}
      {activeTab === "advice" && (
        <div
          style={{
            background: "white",
            padding: "60px 40px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>💡</div>
          <h2
            style={{
              fontSize: "24px",
              color: "#666",
              marginBottom: "15px",
              fontWeight: "500",
            }}
          >
            Game Advice Configuration
          </h2>
          <p
            style={{
              color: "#999",
              maxWidth: "600px",
              margin: "0 auto 30px",
              lineHeight: "1.6",
            }}
          >
            Configure contextual advice prompts based on remaining time and
            tasks completed. This feature will allow you to define dynamic
            advice messages for different game states.
          </p>
          <div
            style={{
              marginTop: "40px",
              padding: "30px",
              background: "#f9f9f9",
              borderRadius: "8px",
              maxWidth: "500px",
              margin: "40px auto 0",
              border: "2px dashed #ddd",
            }}
          >
            <p
              style={{
                color: "#666",
                fontSize: "15px",
                margin: 0,
                fontWeight: "500",
              }}
            >
              Coming Soon: Dynamic 2D Advice Matrix
            </p>
            <p
              style={{
                color: "#999",
                fontSize: "13px",
                margin: "10px 0 0",
                lineHeight: "1.5",
              }}
            >
              Define advice based on time remaining × tasks completed thresholds
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

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
    difficultyMode: "fixed"
  });
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadGameConfig();
    fetchStudents();
  }, []);

  const loadGameConfig = async () => {
    try {
      const docRef = doc(db, "game_settings", "global");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setGameConfig({ ...gameConfig, ...docSnap.data() });
      }
    } catch (error) {
      console.error("Error loading game config:", error);
    }
  };

  const saveGameConfig = async () => {
    setSavingConfig(true);
    try {
      const docRef = doc(db, "game_settings", "global");
      await setDoc(docRef, gameConfig, { merge: true });
      alert("Configuration saved successfully!");
    } catch (error) {
      console.error("Error saving config:", error);
      alert("Failed to save configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleConfigChange = (key, value) => {
    setGameConfig(prev => ({ ...prev, [key]: value }));
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const studentsRef = collection(db, "students");
      const querySnapshot = await getDocs(studentsRef);
      const studentData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentData);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetAllData = async () => {
    if (!window.confirm("Are you sure you want to reset ALL student data? This cannot be undone!")) {
      return;
    }
    
    setRefreshing(true);
    try {
      const studentsRef = collection(db, "students");
      const querySnapshot = await getDocs(studentsRef);
      
      for (const docSnapshot of querySnapshot.docs) {
        await setDoc(doc(db, "students", docSnapshot.id), {
          hasPlayed: false,
          totalAccesses: 0,
          scores: []
        }, { merge: true });
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

  const tabButtonStyle = (isActive) => ({
    padding: "12px 24px",
    background: isActive ? "#2196F3" : "transparent",
    color: isActive ? "white" : "#666",
    border: "none",
    borderBottom: isActive ? "3px solid #2196F3" : "3px solid transparent",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: isActive ? "600" : "normal",
    transition: "all 0.2s"
  });

  const totalStudents = students.filter(s => !s.section?.includes("ADMIN")).length;
  const playedStudents = students.filter(s => !s.section?.includes("ADMIN") && s.hasPlayed).length;

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ margin: 0, color: "#333" }}>🔐 Master Admin Dashboard</h1>
        <button 
          onClick={onClose}
          style={{ padding: "10px 20px", background: "#f44336", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
        >
          Exit Admin
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", borderBottom: "1px solid #e0e0e0", marginBottom: "30px" }}>
        <button onClick={() => setActiveTab("config")} style={tabButtonStyle(activeTab === "config")}>
          ⚙️ Game Configuration
        </button>
        <button onClick={() => setActiveTab("players")} style={tabButtonStyle(activeTab === "players")}>
          👥 Player Data
        </button>
        <button onClick={() => setActiveTab("advice")} style={tabButtonStyle(activeTab === "advice")}>
          💡 Game Advice
        </button>
      </div>

      {/* Game Configuration Tab */}
      {activeTab === "config" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            {/* Time & Semesters */}
            <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", color: "#555" }}>⏱️ Time & Semesters</h3>
              
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: "600" }}>Semester Duration (Minutes)</label>
                <input 
                  type="number" 
                  value={gameConfig.semesterDuration} 
                  onChange={(e) => handleConfigChange("semesterDuration", parseInt(e.target.value))}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "14px" }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: "600" }}>Total Semesters</label>
                <input 
                  type="number" 
                  value={gameConfig.totalSemesters} 
                  onChange={(e) => handleConfigChange("totalSemesters", parseInt(e.target.value))}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input 
                  type="checkbox" 
                  checked={gameConfig.midtermEnabled} 
                  onChange={(e) => handleConfigChange("midtermEnabled", e.target.checked)}
                  id="midtermCheck"
                />
                <label htmlFor="midtermCheck" style={{ fontSize: "13px", cursor: "pointer" }}>Enable Midterm Checkpoint</label>
              </div>
            </div>

            {/* Task Settings */}
            <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", color: "#555" }}>📋 Task Settings</h3>
              
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: "600" }}>Total Tasks per Semester</label>
                <input 
                  type="number" 
                  value={gameConfig.totalTasks} 
                  onChange={(e) => handleConfigChange("totalTasks", parseInt(e.target.value))}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "14px" }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: "600" }}>Difficulty Configuration</label>
                <select 
                  value={gameConfig.difficultyMode || "fixed"} 
                  onChange={(e) => handleConfigChange("difficultyMode", e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "14px" }}
                >
                  <option value="fixed">Fixed (50% Easy, 30% Medium, 20% Hard)</option>
                  <option value="manual">Manual (User chooses difficulty)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: "600" }}>Task Order Strategy</label>
                <select 
                  value={gameConfig.taskOrderStrategy} 
                  onChange={(e) => handleConfigChange("taskOrderStrategy", e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "14px" }}
                >
                  <option value="sequential_task">Order by Task (Materials → Research → Engagement)</option>
                  <option value="sequential_difficulty">Order by Difficulty (Easy → Medium → Hard)</option>
                </select>
              </div>
            </div>

            {/* Penalties & Mechanics */}
            <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", color: "#555" }}>⚖️ Penalties & Mechanics</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "600" }}>Switch Cost (Points)</label>
                  <input 
                    type="number" 
                    value={gameConfig.switchCost || 0} 
                    onChange={(e) => handleConfigChange("switchCost", parseInt(e.target.value))}
                    style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "600" }}>Refill Freeze (Seconds)</label>
                  <input 
                    type="number" 
                    value={gameConfig.jarRefillFreezeTime || 0} 
                    onChange={(e) => handleConfigChange("jarRefillFreezeTime", parseInt(e.target.value))}
                    style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "600" }}>Unfinished Jar Penalty (Pts)</label>
                  <input 
                    type="number" 
                    value={gameConfig.unfinishedJarPenalty || 0} 
                    onChange={(e) => handleConfigChange("unfinishedJarPenalty", parseInt(e.target.value))}
                    style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "600" }}>AI Delay (Seconds)</label>
                  <input 
                    type="number" 
                    value={gameConfig.aiDelay || 0} 
                    onChange={(e) => handleConfigChange("aiDelay", parseInt(e.target.value))}
                    style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "13px" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div style={{ textAlign: "right" }}>
            <button
              onClick={saveGameConfig}
              disabled={savingConfig}
              style={{
                padding: "12px 30px",
                background: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: savingConfig ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "14px",
                opacity: savingConfig ? 0.6 : 1
              }}
            >
              {savingConfig ? "Saving..." : "💾 Save Settings"}
            </button>
          </div>
        </div>
      )}

      {/* Player Data Tab */}
      {activeTab === "players" && (
        <div style={{ background: "white", padding: "25px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, fontSize: "18px" }}>Active Sessions</h2>
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
                opacity: refreshing ? 0.6 : 1
              }}
            >
              {refreshing ? "Processing..." : "🗑️ Reset All Data"}
            </button>
          </div>

          <div style={{ marginBottom: "20px", padding: "15px", background: "#f5f5f5", borderRadius: "6px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", textAlign: "center" }}>
              <div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2196F3" }}>{totalStudents}</div>
                <div style={{ fontSize: "13px", color: "#666" }}>Total Students</div>
              </div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#4CAF50" }}>{playedStudents}</div>
                <div style={{ fontSize: "13px", color: "#666" }}>Have Played</div>
              </div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ff9800" }}>{totalStudents - playedStudents}</div>
                <div style={{ fontSize: "13px", color: "#666" }}>Never Played</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>Loading student data...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                    <th style={{ padding: "12px", borderBottom: "2px solid #ddd", fontSize: "13px" }}>Student ID</th>
                    <th style={{ padding: "12px", borderBottom: "2px solid #ddd", fontSize: "13px" }}>Section</th>
                    <th style={{ padding: "12px", borderBottom: "2px solid #ddd", fontSize: "13px" }}>Has Played</th>
                    <th style={{ padding: "12px", borderBottom: "2px solid #ddd", fontSize: "13px" }}>Total Accesses</th>
                    <th style={{ padding: "12px", borderBottom: "2px solid #ddd", fontSize: "13px" }}>Highest Score</th>
                  </tr>
                </thead>
                <tbody>
                  {students.filter(s => !s.section?.includes("ADMIN")).map(student => (
                    <tr key={student.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "12px", fontSize: "13px" }}>{student.sid || student.id}</td>
                      <td style={{ padding: "12px", fontSize: "13px" }}>{student.section || "N/A"}</td>
                      <td style={{ padding: "12px", fontSize: "13px" }}>
                        <span style={{ 
                          padding: "4px 12px", 
                          borderRadius: "12px", 
                          background: student.hasPlayed ? "#e8f5e9" : "#f5f5f5",
                          color: student.hasPlayed ? "#4CAF50" : "#999",
                          fontSize: "12px",
                          fontWeight: "500"
                        }}>
                          {student.hasPlayed ? "Yes" : "No"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", fontSize: "13px", fontWeight: "600" }}>{student.totalAccesses || 0}</td>
                      <td style={{ padding: "12px", fontSize: "13px", fontWeight: "600", color: "#2196F3" }}>
                        {student.scores && student.scores.length > 0 ? Math.max(...student.scores.map(s => s.total || 0)) : 0}
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
        <div style={{ background: "white", padding: "60px 40px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", textAlign: "center" }}>
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>💡</div>
          <h2 style={{ fontSize: "24px", color: "#666", marginBottom: "15px", fontWeight: "500" }}>Game Advice Configuration</h2>
          <p style={{ color: "#999", maxWidth: "600px", margin: "0 auto 30px", lineHeight: "1.6" }}>
            Configure contextual advice prompts based on remaining time and tasks completed. 
            This feature will allow you to define dynamic advice messages for different game states.
          </p>
          <div style={{ 
            marginTop: "40px", 
            padding: "30px", 
            background: "#f9f9f9", 
            borderRadius: "8px", 
            maxWidth: "500px", 
            margin: "40px auto 0",
            border: "2px dashed #ddd"
          }}>
            <p style={{ color: "#666", fontSize: "15px", margin: 0, fontWeight: "500" }}>
              Coming Soon: Dynamic 2D Advice Matrix
            </p>
            <p style={{ color: "#999", fontSize: "13px", margin: "10px 0 0", lineHeight: "1.5" }}>
              Define advice based on time remaining × tasks completed thresholds
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

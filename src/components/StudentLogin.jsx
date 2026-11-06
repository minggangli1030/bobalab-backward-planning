// src/components/StudentLogin.jsx - Updated with experimental conditions
import React, { useState, useEffect } from "react";
import { codeVerification } from "../utils/codeVerification";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function StudentLogin({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTestCodes, setShowTestCodes] = useState(false);
  const [gameTitle, setGameTitle] = useState("Welcome to Scheduling Game");

  // Load game title from config
  useEffect(() => {
    const loadGameTitle = async () => {
      try {
        // First try localStorage (set by App.jsx)
        const storedConfig = localStorage.getItem("globalConfig");
        if (storedConfig) {
          const config = JSON.parse(storedConfig);
          if (config.gameTitle) {
            setGameTitle(config.gameTitle);
            return;
          }
        }
        // Fallback to Firebase
        const docRef = doc(db, "game_settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.gameTitle) {
            setGameTitle(data.gameTitle);
          }
        }
      } catch (error) {
        console.error("Error loading game title:", error);
      }
    };
    loadGameTitle();
  }, []);

  // COMMENTED OUT FOR TESTING: Original Student ID validation system
  // Will be restored after internal testing is complete
  /*
  // Student ID regex patterns
  const idPatterns = {
    legacy8: /^\d{8}$/,
    legacy10: /^\d{10}$/,
    standard: /^30\d{8}$/,
  };
  */

  // Master codes for testing
  const MASTER_CODES = {
    // Able to refresh student access
    "MASTER": {
      section: "ADMIN-MASTER",
      role: "master_admin",
      name: "Master Administrator",
      hasAI: false,
      isMasterInterface: true,
    },

    // Standard Admin Mode
    "ADMIN": {
      role: "admin",
      semesterDuration: 720000, // 12 min
      name: "Admin User",
      hasAI: true,
      checkpointSemester2: true,
    },
  };

  // Original participant roster intentionally omitted from source.

  // TESTING MODE: Simple name-based login for internal testing
  // IMPORTANT: All internal testers get AI + Checkpoint for consistent testing experience
  const getTestingCondition = (name) => {
    return {
      section: "TESTING-AI-CP", 
      hasAI: true, 
      checkpointSemester2: true, 
      displayName: `${name} (Internal Tester - AI + Checkpoint)`
    };
  };

  const validateStudentId = (id) => {
    // Check master codes first
    if (MASTER_CODES[id]) {
      return { valid: true, type: "master", data: MASTER_CODES[id] };
    }

    // TESTING MODE: Accept any non-empty name for testing
    // Remove special characters and ensure it's a reasonable name
    const cleanName = id.trim().replace(/[^a-zA-Z0-9\s\-_]/g, '');
    
    if (cleanName.length < 2) {
      return { valid: false, error: "Please enter a name with at least 2 characters" };
    }
    
    if (cleanName.length > 50) {
      return { valid: false, error: "Name too long. Please use 50 characters or less" };
    }

    // For testing, generate condition based on name
    const condition = getTestingCondition(cleanName);
    return {
      valid: true,
      type: "tester",
      condition,
      cleanName
    };

    /* COMMENTED OUT: Original validation logic
    // Check student ID formats
    for (const [type, pattern] of Object.entries(idPatterns)) {
      if (pattern.test(id)) {
        // Check if ID exists in database
        if (VALID_STUDENT_IDS.includes(id)) {
          const condition = getStudentCondition(id);
          return {
            valid: true,
            type: "student",
            format: type,
            condition,
          };
        }
        return { valid: false, error: "Student ID not found in registry" };
      }
    }

    return {
      valid: false,
      error: "Invalid ID format. Must be 8-10 digit Student ID",
    };
    */
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!identifier.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const validation = validateStudentId(identifier.trim());

      if (!validation.valid) {
        setError(validation.error || "Invalid Student ID");
        setLoading(false);
        return;
      }

      let codeData = {
        timestamp: new Date().toISOString(),
      };

      if (validation.type === "master") {
        // Handle master code
        codeData = {
          ...codeData,
          studentIdentifier: identifier,
          role: validation.data.role,
          semesterDuration: validation.data.semesterDuration,
          displayName: validation.data.name,
          section: validation.data.isTestCode ? "ADMIN-TEST" : "ADMIN", // Add section field
          hasAI: validation.data.hasAI,
          checkpointSemester2: validation.data.checkpointSemester2,
          isMasterCode: true,
          isTestCode: validation.data.isTestCode || false,
          isMasterInterface: validation.data.isMasterInterface || false,
        };

        // Special redirect for master admin
        if (validation.data.isMasterInterface) {
          sessionStorage.setItem(
            "gameConfig",
            JSON.stringify({
              role: "master_admin",
              displayName: validation.data.name,
              section: "master_admin",
              hasAI: true,
              checkpointSemester2: true,
            })
          );

          window.location.href = `${window.location.origin}?master=true`;
          return;
        }
      } else if (validation.type === "tester") {
        // Handle name-based tester login
        const condition = validation.condition;
        const cleanName = validation.cleanName;
        codeData = {
          ...codeData,
          studentIdentifier: cleanName, // Use clean name as identifier
          role: "tester", // New role for testers
          semesterDuration: 720000, // Normal 12 min like students
          displayName: condition.displayName,
          section: condition.section,
          hasAI: condition.hasAI,
          checkpointSemester2: condition.checkpointSemester2,
          isMasterCode: false,
          isTestUser: true, // Flag to identify test users
        };
      } else {
        // COMMENTED OUT: Original student validation
        /*
        // Regular student - apply experimental condition
        const condition = validation.condition;
        codeData = {
          ...codeData,
          studentIdentifier: identifier,
          role: "student",
          semesterDuration: 720000, // Normal 12 min
          displayName: condition.displayName,
          section: condition.section,
          hasAI: condition.hasAI,
          checkpointSemester2: condition.checkpointSemester2,
          isMasterCode: false,
        };
        */
      }

      const result = await codeVerification.createCode(codeData);

      if (result.success) {
        // Store the config in sessionStorage for the game to read
        sessionStorage.setItem(
          "gameConfig",
          JSON.stringify({
            semesterDuration: codeData.semesterDuration,
            role: codeData.role,
            studentId: codeData.studentIdentifier, // Use the clean name for testers
            displayName: codeData.displayName,
            section: codeData.section,
            hasAI: codeData.hasAI,
            checkpointSemester2: codeData.checkpointSemester2,
          })
        );

        // Redirect with the code
        window.location.href = `${window.location.origin}?code=${result.code}`;
      } else {
        setError("Failed to generate access code. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("System error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "48px",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          maxWidth: "480px",
          width: "100%",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#1a202c",
              marginBottom: "8px",
              lineHeight: "1.2",
            }}
          >
            {gameTitle}
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "#718096",
              marginTop: "12px",
            }}
          >
            Enter your name to access the game
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#2d3748",
                fontWeight: "600",
                fontSize: "14px",
                textTransform: "uppercase",
                letterSpacing: "0.025em",
              }}
            >
              Your Name:
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: "16px",
                border: "2px solid #e2e8f0",
                borderRadius: "8px",
                boxSizing: "border-box",
                fontFamily: "'SF Mono', Monaco, 'Courier New', monospace",
                transition: "all 0.2s ease",
                background: "#f7fafc",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#2196F3";
                e.target.style.background = "white";
                e.target.style.boxShadow = "0 0 0 3px rgba(33, 150, 243, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.background = "#f7fafc";
                e.target.style.boxShadow = "none";
              }}
            />
            <div
              style={{
                marginTop: "8px",
                fontSize: "13px",
                color: "#a0aec0",
                lineHeight: "1.4",
              }}
            >
              Enter your first and last name (2-50 characters)
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: "#fed7d7",
                color: "#c53030",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "24px",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                border: "1px solid #fc8181",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                style={{ marginRight: "8px", flexShrink: 0 }}
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 24px",
              fontSize: "16px",
              fontWeight: "600",
              background: loading ? "#cbd5e0" : "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: loading
                ? "none"
                : "0 4px 6px rgba(33, 150, 243, 0.25)",
              transform: loading ? "none" : "translateY(0)",
            }}
            onMouseDown={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(2px)";
                e.target.style.boxShadow = "0 2px 4px rgba(33, 150, 243, 0.25)";
              }
            }}
            onMouseUp={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 6px rgba(33, 150, 243, 0.25)";
              }
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.background = "#1976D2";
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.target.style.background = "#2196F3";
              }
            }}
          >
            {loading ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  className="animate-spin"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    marginRight: "8px",
                    animation: "spin 1s linear infinite",
                  }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeOpacity="0.25"
                  />
                  <path
                    d="M4 12a8 8 0 018-8"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
                Verifying Name...
              </span>
            ) : (
              "Access Game"
            )}
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          {/* Admin codes display for testing - you can toggle this */}
          {showTestCodes && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                background: "#f7fafc",
                borderRadius: "8px",
                fontSize: "11px",
                color: "#4a5568",
                lineHeight: "1.8",
              }}
            >
              <strong>Test Codes:</strong>
              <div style={{ marginTop: "8px", fontFamily: "monospace" }}>
                <div>ADMIN (Standard Game Mode)</div>
                <div>MASTER (Master interface)</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add spinning animation keyframes */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

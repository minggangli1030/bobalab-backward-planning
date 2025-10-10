import React, { useEffect } from "react";

export default function GameModeSelector({ onModeSelected }) {
  // Auto-select Pass All mode with 12 tasks
  useEffect(() => {
    // Automatically select the mode after a short delay
    const timer = setTimeout(() => {
      onModeSelected({
        accuracy: "lenient", // Pass All mode
        limit: "tasks", // 12 task attempts
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [onModeSelected]);

  return (
    <div
      style={{
        marginBottom: "30px",
        padding: "20px",
        background: "#f8f9fa",
        borderRadius: "8px",
        border: "2px solid #4CAF50",
      }}
    >
      <h3
        style={{ color: "#4CAF50", marginBottom: "15px", textAlign: "center" }}
      >
        Game Mode: Pass All + 12 Tasks
      </h3>

      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            padding: "15px 25px",
            background: "#e8f5e9",
            borderRadius: "8px",
            border: "2px solid #4CAF50",
            color: "#2e7d32",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0" }}>✅ Pass All Mode Active</h4>
          <p style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
            Every attempt counts as a pass, but accuracy is still tracked
          </p>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: "bold" }}>
            📊 You have 12 total task attempts to use strategically
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: "15px",
          padding: "10px",
          background: "#fff",
          borderRadius: "6px",
          fontSize: "13px",
          color: "#666",
          textAlign: "center",
        }}
      >
        <strong>Tip:</strong> Choose which tasks to attempt wisely - you can't
        try everything!
      </div>
    </div>
  );
}

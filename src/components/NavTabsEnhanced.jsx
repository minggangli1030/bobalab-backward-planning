import React from "react";

export default function NavTabsEnhanced({
  current,
  completed,
  onSwitch,
  limitMode,
  taskPoints = {},
  categoryMultipliers = {},
  starGoals = {},
  categoryPoints = {},
  timeRemaining = null,
}) {
  const calculateStudentLearning = () => {
    const materialsPoints = categoryPoints.materials || 0;
    const researchMultiplier = 1 + (categoryPoints.research || 0) * 0.15;

    // Get accumulated engagement interest
    const engagementInterest =
      parseFloat(localStorage.getItem("engagementInterest") || "0") || 0;

    const baseScore = materialsPoints * researchMultiplier;
    return baseScore + engagementInterest;
  };

  // Calculate these once at component level
  const engagementInterest =
    parseFloat(localStorage.getItem("engagementInterest") || "0") || 0;
  const researchMultiplier = 1 + (categoryPoints.research || 0) * 0.15;

  // Generate all 300 tabs (100 per game) - reordered for display
  const tabs = [];
  // Generate in original order first (important for task IDs)
  for (let game = 1; game <= 3; game++) {
    for (let level = 1; level <= 100; level++) {
      const gameLabel = ["Research", "Materials", "Engage"][game - 1];
      tabs.push({
        id: `g${game}t${level}`,
        label: `${gameLabel} ${level}`,
        game: game,
      });
    }
  }

  // Task availability logic
  const isTaskAvailable = (tab) => {
    const game = tab.id[1];
    const taskNum = parseInt(tab.id.substring(3));

    if (taskNum === 1) {
      return true;
    }

    const previousTask = `g${game}t${taskNum - 1}`;
    return completed[previousTask] === true;
  };

  // Group tabs by game - reordered to show Materials first
  const gameGroups = {
    2: tabs.filter((t) => t.game === 2), // Materials first
    1: tabs.filter((t) => t.game === 1), // Research second
    3: tabs.filter((t) => t.game === 3), // Engagement third
  };

  const gameColors = {
    1: "#9C27B0", // Purple for research
    2: "#4CAF50", // Green for materials
    3: "#f44336", // Red for engagement
  };

  const gameIcons = {
    1: "📚",
    2: "🎯",
    3: "✉️",
  };

  const gameNames = {
    1: "Research",
    2: "Materials",
    3: "Engagement",
  };

  const gameCategoryMap = {
    1: "research", // g1 → Research (multiplier)
    2: "materials", // g2 → Materials (base points)
    3: "engagement", // g3 → Engagement (interest)
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "25px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        marginBottom: "20px",
      }}
    >
      {/* Game progress sections */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          marginBottom: "25px",
        }}
      >
        {/* Explicitly order: Materials (2), Research (1), Engagement (3) */}
        {[2, 1, 3].map((gameNum) => {
          const gameTabs = gameGroups[gameNum];
          const completedInGame = gameTabs.filter(
            (t) => completed[t.id]
          ).length;
          const categoryName = gameCategoryMap[gameNum];
          const currentGameLevel = completedInGame + 1;

          // Show multiplier based on new formula
          const researchMult =
            gameNum === "1" ? (categoryPoints.research || 0) * 0.15 : 0;
          const engagementMult =
            gameNum === "3" ? (categoryPoints.engagement || 0) * 0.0015 : 0; // 0.15% per engagement point
          const hasMultiplier = researchMult > 0 || engagementMult > 0;

          return (
            <div
              key={gameNum}
              style={{
                background: `linear-gradient(135deg, ${gameColors[gameNum]}10 0%, ${gameColors[gameNum]}05 100%)`,
                borderRadius: "12px",
                border: `2px solid ${gameColors[gameNum]}20`,
                padding: "20px",
                position: "relative",
                overflow: "hidden",
                boxShadow: hasMultiplier
                  ? `0 0 20px ${gameColors[gameNum]}20`
                  : "none",
                transition: "all 0.3s ease",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "15px",
                }}
              >
                <span style={{ fontSize: "28px" }}>{gameIcons[gameNum]}</span>
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      margin: 0,
                      color: gameColors[gameNum],
                      fontSize: "18px",
                      fontWeight: "bold",
                    }}
                  >
                    {gameNames[gameNum]}
                  </h3>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "2px",
                    }}
                  >
                    Level {Math.min(currentGameLevel, 30)}
                  </div>
                </div>

                {/* Points badge */}
                {categoryPoints && categoryPoints[categoryName] > 0 && (
                  <div
                    style={{
                      background: gameColors[gameNum],
                      color: "white",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    {categoryPoints[categoryName]} pts
                  </div>
                )}
              </div>

              {/* Multiplier indicator */}
              {gameNum === "1" && (categoryPoints.research || 0) > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "#fff3cd",
                    color: "#856404",
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    border: "1px solid #ffc107",
                  }}
                >
                  +{(categoryPoints.research * 15).toFixed(0)}%
                </div>
              )}
              {gameNum === "3" && (categoryPoints.engagement || 0) > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "#fff3cd",
                    color: "#856404",
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    border: "1px solid #ffc107",
                  }}
                >
                  +{((categoryPoints.engagement || 0) * 0.15).toFixed(1)}%
                  interest/task
                </div>
              )}

              {/* Level buttons - visible levels only */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                {gameTabs
                  .filter((tab) => {
                    const taskNum = parseInt(tab.id.substring(3));
                    return taskNum <= currentGameLevel;
                  })
                  .map((tab) => {
                    const isAvailable = isTaskAvailable(tab);
                    const isCompleted = completed[tab.id];
                    const isCurrent = current === tab.id;
                    const taskNum = parseInt(tab.id.substring(3));
                    const points = taskPoints[tab.id] || 0;

                    return (
                      <button
                        key={tab.id}
                        disabled={!isAvailable || isCompleted}
                        onClick={() =>
                          isAvailable && !isCompleted && onSwitch(tab.id)
                        }
                        style={{
                          position: "relative",
                          width: "40px",
                          height: "40px",
                          padding: "0",
                          fontSize: "14px",
                          fontWeight: isCurrent ? "bold" : "500",
                          border: `2px solid ${
                            isCurrent
                              ? gameColors[gameNum]
                              : isCompleted
                              ? `${gameColors[gameNum]}40`
                              : "#e0e0e0"
                          }`,
                          borderRadius: "8px",
                          background: isCurrent
                            ? gameColors[gameNum]
                            : isCompleted
                            ? `${gameColors[gameNum]}10`
                            : "white",
                          color: isCurrent
                            ? "white"
                            : isCompleted
                            ? gameColors[gameNum]
                            : "#333",
                          cursor:
                            isAvailable && !isCompleted
                              ? "pointer"
                              : "not-allowed",
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          opacity: isCompleted ? 0.7 : 1,
                          boxShadow: isCurrent
                            ? `0 2px 8px ${gameColors[gameNum]}40`
                            : "none",
                          transform: "translateY(0)",
                          willChange: "transform, box-shadow",
                        }}
                        onMouseEnter={(e) => {
                          if (isAvailable && !isCurrent && !isCompleted) {
                            requestAnimationFrame(() => {
                              e.currentTarget.style.transform =
                                "translateY(-2px)";
                              e.currentTarget.style.boxShadow = `0 4px 12px ${gameColors[gameNum]}30`;
                            });
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isAvailable && !isCurrent && !isCompleted) {
                            requestAnimationFrame(() => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = "none";
                            });
                          }
                        }}
                        title={
                          isCompleted
                            ? `Level ${taskNum} completed (${points} pts)`
                            : isAvailable
                            ? `Start Level ${taskNum}`
                            : `Complete Level ${taskNum - 1} first`
                        }
                      >
                        {taskNum}
                        {isCompleted && (
                          <span
                            style={{
                              position: "absolute",
                              top: "-4px",
                              right: "-4px",
                              background: gameColors[gameNum],
                              color: "white",
                              width: "16px",
                              height: "16px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              fontWeight: "bold",
                            }}
                          >
                            ✓
                          </span>
                        )}
                        {/* Points dots - show 0, 1, or 2 dots based on actual points */}
                        {isCompleted && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: "2px",
                              left: "50%",
                              transform: "translateX(-50%)",
                              display: "flex",
                              gap: "2px",
                            }}
                          >
                            {points === 0 ? (
                              // Show empty circle for 0 points
                              <div
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  border: `1px solid ${gameColors[gameNum]}`,
                                  background: "transparent",
                                }}
                              />
                            ) : (
                              // Show filled dots for 1 or 2 points
                              [...Array(Math.min(points, 2))].map((_, i) => (
                                <div
                                  key={i}
                                  style={{
                                    width: "4px",
                                    height: "4px",
                                    borderRadius: "50%",
                                    background: gameColors[gameNum],
                                  }}
                                />
                              ))
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom status bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px",
          background: "#f8f9fa",
          borderRadius: "8px",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        {/* Timer */}
        {timeRemaining !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>⏱️</span>
            <div>
              <div
                style={{
                  fontSize: "24px", // Increased from 20px
                  fontWeight: "bold",
                  color: timeRemaining < 60 ? "#f44336" : "#333",
                }}
              >
                {Math.floor(timeRemaining / 60)}:
                {(timeRemaining % 60).toString().padStart(2, "0")}
              </div>
              {timeRemaining < 180 && timeRemaining > 0 && (
                <div style={{ fontSize: "11px", color: "#ff9800" }}>
                  Hurry up!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tasks completed */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#666", marginBottom: "2px" }}>
            Tasks Completed
          </div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}>
            {Object.keys(completed).length}
          </div>
        </div>

        {/* Student Learning Score */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#666", marginBottom: "2px" }}>
            Student Learning
          </div>
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#2196F3" }}
          >
            {Math.round(calculateStudentLearning())}
          </div>
          <div style={{ fontSize: "10px", color: "#999" }}>
            {categoryPoints.materials || 0} (materials) × {researchMultiplier.toFixed(2)} (research) + {engagementInterest.toFixed(1)} (cumulative engagement interest)
          </div>
        </div>

        {/* Current task */}
        {current && (
          <div
            style={{
              padding: "8px 16px",
              background: current.startsWith("g1")
                ? "#9C27B0"
                : current.startsWith("g2")
                ? "#4CAF50"
                : "#f44336",
              color: "white",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            Current:{" "}
            {current
              .replace("g1t", "Research ")
              .replace("g2t", "Materials ")
              .replace("g3t", "Engage ")}
          </div>
        )}
      </div>
    </div>
  );
}

import React from "react";

export default function StarProgress({
  starGoals,
  categoryPoints,
  categoryMultipliers,
  timeRemaining,
}) {
  const totalPoints =
    categoryPoints.counting + categoryPoints.slider + categoryPoints.typing;
  const perfectionRate =
    starGoals.star3.totalAttempts > 0
      ? (
          (starGoals.star3.perfectCount / starGoals.star3.totalAttempts) *
          100
        ).toFixed(1)
      : 0;

  // Determine focus category (highest points)
  const focusCategory = Object.entries(categoryPoints).sort(
    ([, a], [, b]) => b - a
  )[0];
  const focusCategoryName = focusCategory[0];
  const focusCategoryPoints = focusCategory[1];

  // Calculate current multiplier bonus for focus category
  const otherMultipliers = Object.entries(categoryMultipliers)
    .filter(([cat]) => cat !== focusCategoryName)
    .reduce((sum, [_, mult]) => sum + mult, 0);
  const currentMultiplierBonus = 1 + otherMultipliers;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        background: "white",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        minWidth: "300px",
        zIndex: 1000,
      }}
    >
      {/* Timer */}
      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: timeRemaining < 60 ? "#f44336" : "#333",
          textAlign: "center",
          marginBottom: "15px",
        }}
      >
        {Math.floor(timeRemaining / 60)}:
        {(timeRemaining % 60).toString().padStart(2, "0")}
      </div>

      {/* Points by category */}
      <div style={{ marginBottom: "15px" }}>
        <div>🔢 Counting: {categoryPoints.counting} pts</div>
        <div>🎯 Slider: {categoryPoints.slider} pts</div>
        <div>⌨️ Typing: {categoryPoints.typing} pts</div>
        <div style={{ fontWeight: "bold", marginTop: "5px" }}>
          Total: {totalPoints} points
        </div>
      </div>

      {/* Star Goals - All visible */}
      <div>
        <h4 style={{ margin: "10px 0 5px 0" }}>Star Goals</h4>

        {/* Star 1 */}
        <div
          style={{
            marginBottom: "8px",
            padding: "8px",
            background: starGoals.star1.achieved ? "#e8f5e9" : "#f5f5f5",
            borderRadius: "6px",
            border: `1px solid ${
              starGoals.star1.achieved ? "#4CAF50" : "#e0e0e0"
            }`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>⭐</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                Star 1: {Math.min(totalPoints, 25)}/25 pts
              </div>
              <div style={{ fontSize: "11px", color: "#666" }}>
                Bonus: C×S×T = {categoryPoints.counting}×{categoryPoints.slider}
                ×{categoryPoints.typing}
                {starGoals.star1.achieved && (
                  <span style={{ color: "#4CAF50", fontWeight: "bold" }}>
                    {" "}
                    = {starGoals.star1.bonusEarned}
                  </span>
                )}
              </div>
            </div>
            {starGoals.star1.achieved && (
              <span style={{ color: "#4CAF50", fontSize: "18px" }}>✓</span>
            )}
          </div>
        </div>

        {/* Star 2 - Always visible */}
        <div
          style={{
            marginBottom: "8px",
            padding: "8px",
            background: starGoals.star2.achieved ? "#e8f5e9" : "#f5f5f5",
            borderRadius: "6px",
            border: `1px solid ${
              starGoals.star2.achieved ? "#4CAF50" : "#e0e0e0"
            }`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>⭐⭐</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                Star 2: {Math.min(focusCategoryPoints, 20)}/20 in one category
              </div>
              <div style={{ fontSize: "11px", color: "#666" }}>
                Leading: {focusCategoryName} ({focusCategoryPoints} pts)
                {focusCategoryPoints > 0 && (
                  <span> × {currentMultiplierBonus.toFixed(1)}</span>
                )}
              </div>
              <div style={{ fontSize: "10px", color: "#999" }}>
                Multipliers: C×0.2 | S×0.3 | T×0.2
              </div>
            </div>
            {starGoals.star2.achieved && (
              <span style={{ color: "#4CAF50", fontSize: "18px" }}>✓</span>
            )}
          </div>
        </div>

        {/* Star 3 - Always visible */}
        <div
          style={{
            marginBottom: "8px",
            padding: "8px",
            background: starGoals.star3.achieved ? "#e8f5e9" : "#f5f5f5",
            borderRadius: "6px",
            border: `1px solid ${
              starGoals.star3.achieved ? "#4CAF50" : "#e0e0e0"
            }`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>⭐⭐⭐</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                Star 3: {Math.min(totalPoints, 50)}/50 pts
              </div>
              <div style={{ fontSize: "11px", color: "#666" }}>
                Perfection: {perfectionRate}% ({starGoals.star3.perfectCount}/
                {starGoals.star3.totalAttempts})
                {starGoals.star3.achieved && (
                  <span style={{ color: "#4CAF50", fontWeight: "bold" }}>
                    {" "}
                    Bonus: {starGoals.star3.bonusEarned}
                  </span>
                )}
              </div>
            </div>
            {starGoals.star3.achieved && (
              <span style={{ color: "#4CAF50", fontSize: "18px" }}>✓</span>
            )}
          </div>
        </div>
      </div>

      {/* Active multipliers indicator */}
      {(categoryMultipliers.counting > 0 ||
        categoryMultipliers.slider > 0 ||
        categoryMultipliers.typing > 0) && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px",
            background: "#fff3cd",
            borderRadius: "6px",
            border: "1px solid #ffc107",
            fontSize: "12px",
          }}
        >
          <strong>Active Multipliers:</strong>
          <div style={{ marginTop: "4px" }}>
            {categoryMultipliers.counting > 0 && (
              <div>🔢 {categoryMultipliers.counting.toFixed(1)}x</div>
            )}
            {categoryMultipliers.slider > 0 && (
              <div>🎯 {categoryMultipliers.slider.toFixed(1)}x</div>
            )}
            {categoryMultipliers.typing > 0 && (
              <div>⌨️ {categoryMultipliers.typing.toFixed(1)}x</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

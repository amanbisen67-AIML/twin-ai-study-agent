import React from "react";
import { TrendingUp, TrendingDown, Target, Zap, Award } from "lucide-react";

export function ReadinessGauge({
  readinessScore = 0,
  readinessDelta = 0,
  totalAttempts = 0,
  rankedTopics = []
}) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readinessScore / 100) * circumference;

  // Determine accent color for score
  let strokeColor = "var(--accent-amber)";
  if (readinessScore >= 75) strokeColor = "var(--accent-emerald)";
  else if (readinessScore >= 50) strokeColor = "var(--accent-cyan)";
  else if (readinessScore < 40) strokeColor = "var(--accent-rose)";

  const weakCount = rankedTopics.filter(t => t.urgency === "CRITICAL" || t.urgency === "NEEDS_REVIEW").length;
  const masteredCount = rankedTopics.filter(t => t.urgency === "MASTERED").length;

  return (
    <div className="readiness-deck">
      <div className="deck-header">
        <span className="deck-title">
          <Target size={15} color="var(--accent-cyan)" />
          Readiness Telemetry
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-dim)" }}>
          ACTIVE GAUGE
        </span>
      </div>

      <div className="gauge-wrapper">
        <svg className="gauge-svg" viewBox="0 0 200 200">
          <circle
            className="gauge-track"
            cx="100"
            cy="100"
            r={radius}
          />
          <circle
            className="gauge-fill"
            cx="100"
            cy="100"
            r={radius}
            style={{
              stroke: strokeColor,
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset
            }}
          />
        </svg>

        <div className="gauge-center-content">
          <div className="gauge-score-value">
            {Math.round(readinessScore)}
            <span className="gauge-score-pct">%</span>
          </div>

          <div
            className={`gauge-trend-badge ${
              readinessDelta >= 0 ? "trend-up" : "trend-down"
            }`}
          >
            {readinessDelta >= 0 ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            <span>
              {readinessDelta >= 0 ? `+${readinessDelta}%` : `${readinessDelta}%`} vs prev
            </span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: "0.25rem" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-pure)" }}>
          {readinessScore >= 80 ? "Interview Ready" : readinessScore >= 60 ? "Advancing Steady" : "Targeted Drills Required"}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-dim)" }}>
          Recency decay applied (7-day half life)
        </div>
      </div>

      <div className="gauge-legend">
        <div className="legend-stat-box">
          <div className="stat-box-label">Attempts Logged</div>
          <div className="stat-box-value" style={{ color: "var(--accent-cyan)" }}>
            {totalAttempts}
          </div>
        </div>

        <div className="legend-stat-box">
          <div className="stat-box-label">Weak Summits</div>
          <div className="stat-box-value" style={{ color: "var(--accent-amber)" }}>
            {weakCount}
          </div>
        </div>
      </div>
    </div>
  );
}

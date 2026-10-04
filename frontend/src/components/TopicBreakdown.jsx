import React from "react";
import { AlertCircle, CheckCircle2, Clock, BarChart3, Layers } from "lucide-react";

export function TopicBreakdown({ rankedTopics = [], onSelectTopic = null }) {
  return (
    <section className="breakdown-section" aria-label="Topic Breakdown">
      <div className="breakdown-header">
        <div className="breakdown-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Layers size={18} color="var(--accent-cyan)" />
          Curriculum Topic Breakdown
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-dim)" }}>
          {rankedTopics.length} TOPICS EVALUATED
        </span>
      </div>

      <div className="topic-table-card">
        <table className="topic-table">
          <thead>
            <tr>
              <th>Topic Domain</th>
              <th>Recency-Weighted Accuracy</th>
              <th>Attempts (Correct/Total)</th>
              <th>Failure Streak</th>
              <th>Last Interaction</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rankedTopics.map((topic, index) => {
              const accuracyPct = Math.round(topic.recency_weighted_accuracy * 100);
              let barColor = "var(--accent-rose)";
              if (accuracyPct >= 80) barColor = "var(--accent-emerald)";
              else if (accuracyPct >= 65) barColor = "var(--accent-cyan)";
              else if (accuracyPct >= 45) barColor = "var(--accent-amber)";

              return (
                <tr key={topic.topic}>
                  <td>
                    <div className="topic-name-cell">
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", fontSize: "0.75rem" }}>
                        #{index + 1}
                      </span>
                      <span>{topic.topic}</span>
                    </div>
                  </td>

                  <td>
                    <div className="accuracy-bar-wrapper">
                      <div className="accuracy-bar-track">
                        <div
                          className="accuracy-bar-fill"
                          style={{
                            width: `${Math.max(4, accuracyPct)}%`,
                            backgroundColor: barColor
                          }}
                        />
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", width: "40px", color: barColor, fontWeight: 600 }}>
                        {accuracyPct}%
                      </span>
                    </div>
                  </td>

                  <td style={{ fontFamily: "var(--font-mono)" }}>
                    <span style={{ color: "var(--text-pure)" }}>{topic.correct_count}</span>
                    <span style={{ color: "var(--text-dim)" }}> / {topic.attempt_count}</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginLeft: "0.4rem" }}>
                      ({Math.round(topic.raw_accuracy * 100)}% raw)
                    </span>
                  </td>

                  <td style={{ fontFamily: "var(--font-mono)" }}>
                    {topic.recent_fail_streak > 0 ? (
                      <span style={{ color: "var(--accent-rose)", fontWeight: 600 }}>
                        {topic.recent_fail_streak} misses
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>0</span>
                    )}
                  </td>

                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      <Clock size={12} />
                      {topic.last_attempt_ago || "Recent"}
                    </span>
                  </td>

                  <td>
                    <span className={`urgency-badge urgency-${topic.urgency.toLowerCase()}`}>
                      {topic.urgency.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

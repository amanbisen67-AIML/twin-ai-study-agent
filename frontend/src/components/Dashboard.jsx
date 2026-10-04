import React from "react";
import { ReadinessGauge } from "./ReadinessGauge";
import { WeakTopicTerrain } from "./WeakTopicTerrain";
import { TopicBreakdown } from "./TopicBreakdown";
import { GaugeSkeleton, TerrainSkeleton, TableSkeleton } from "./Skeletons";

export function Dashboard({
  analysis,
  isLoading,
  onSelectTopic
}) {
  if (isLoading || !analysis) {
    return (
      <div className="dashboard-grid">
        <GaugeSkeleton />
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <TerrainSkeleton />
          <TableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <main className="dashboard-grid">
      {/* Left Column: Readiness Instrument Deck */}
      <ReadinessGauge
        readinessScore={analysis.readiness_score}
        readinessDelta={analysis.readiness_delta}
        totalAttempts={analysis.total_attempts}
        rankedTopics={analysis.ranked_weak_topics}
      />

      {/* Right Column: Signature Weakness Terrain & Curriculum Matrix */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Signature Visual Moment: Smoothed Terrain Curve */}
        <WeakTopicTerrain
          terrainPoints={analysis.terrain_curve}
          rankedTopics={analysis.ranked_weak_topics}
        />

        {/* Topic-by-Topic Breakdown Table */}
        <TopicBreakdown
          rankedTopics={analysis.ranked_weak_topics}
          onSelectTopic={onSelectTopic}
        />
      </div>
    </main>
  );
}

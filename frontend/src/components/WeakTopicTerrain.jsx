import React, { useState } from "react";
import { Mountain, AlertTriangle, CheckCircle, Info } from "lucide-react";

/**
 * Builds a smooth SVG cubic Bézier path from discrete points (Catmull-Rom to Bézier).
 */
function buildSmoothPath(points, width, height, padding = 40) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M 0 ${height - padding} L ${width} ${height - padding}`;

  const plotPoints = points.map((pt, idx) => {
    const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
    // Elevation (10 - 90): Invert for SVG y (higher elevation = lower y coordinate)
    const normElevation = Math.max(10, Math.min(90, pt.elevation));
    const y = height - padding - (normElevation / 100) * (height - 2 * padding);
    return { x, y, pt };
  });

  // Calculate cubic bezier curves
  let pathStr = `M ${plotPoints[0].x} ${plotPoints[0].y}`;

  for (let i = 0; i < plotPoints.length - 1; i++) {
    const p0 = i > 0 ? plotPoints[i - 1] : plotPoints[i];
    const p1 = plotPoints[i];
    const p2 = plotPoints[i + 1];
    const p3 = i < plotPoints.length - 2 ? plotPoints[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathStr += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  // Area under curve
  const areaStr = `${pathStr} L ${plotPoints[plotPoints.length - 1].x} ${height} L ${plotPoints[0].x} ${height} Z`;

  return { pathStr, areaStr, plotPoints };
}

export function WeakTopicTerrain({ terrainPoints = [], rankedTopics = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const svgWidth = 800;
  const svgHeight = 260;
  const padding = 50;

  const pointsToRender = terrainPoints.length > 0 ? terrainPoints : [
    { topic: "Dynamic Programming", elevation: 85, accuracy: 15, status: "CRITICAL" },
    { topic: "Graphs & BFS/DFS", elevation: 65, accuracy: 35, status: "NEEDS_REVIEW" },
    { topic: "Trees & BST", elevation: 45, accuracy: 55, status: "NEEDS_REVIEW" },
    { topic: "Binary Search", elevation: 35, accuracy: 65, status: "STABLE" },
    { topic: "Sliding Window", elevation: 30, accuracy: 70, status: "STABLE" },
    { topic: "Arrays & Hashing", elevation: 15, accuracy: 92, status: "MASTERED" },
    { topic: "Two Pointers", elevation: 12, accuracy: 96, status: "MASTERED" },
  ];

  const { pathStr, areaStr, plotPoints } = buildSmoothPath(pointsToRender, svgWidth, svgHeight, padding);

  return (
    <div className="terrain-panel">
      <div className="terrain-header">
        <div className="terrain-title-group">
          <div className="terrain-title">
            <Mountain size={18} color="var(--accent-cyan)" />
            <span>Mastery Terrain Curve</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--accent-cyan)", marginLeft: "0.5rem" }}>
              [TOPOLOGICAL WEAKNESS ELEVATION]
            </span>
          </div>
          <div className="terrain-subtitle">
            Summit peaks represent urgent challenge zones requiring high-intensity drills; valleys indicate mastered plains.
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "var(--accent-rose)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-rose)" }} />
            Critical Summit (&gt;75m)
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "var(--accent-emerald)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-emerald)" }} />
            Mastered Plains (&lt;25m)
          </span>
        </div>
      </div>

      <div className="terrain-curve-container">
        <svg
          className="terrain-svg-canvas"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="terrain-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
              <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#070d1a" stopOpacity="0.85" />
            </linearGradient>

            <linearGradient id="stroke-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Background Grid Elevation Lines */}
          <line x1={0} y1={padding} x2={svgWidth} y2={padding} className="terrain-grid-line" />
          <text x={10} y={padding - 5} fill="var(--text-dim)" fontSize="10" fontFamily="var(--font-mono)">
            SUMMIT / HIGH RISK (80m)
          </text>

          <line x1={0} y1={svgHeight / 2} x2={svgWidth} y2={svgHeight / 2} className="terrain-grid-line" />
          <text x={10} y={svgHeight / 2 - 5} fill="var(--text-dim)" fontSize="10" fontFamily="var(--font-mono)">
            RIDGE / DRILL ZONE (50m)
          </text>

          <line x1={0} y1={svgHeight - padding} x2={svgWidth} y2={svgHeight - padding} className="terrain-grid-line" />
          <text x={10} y={svgHeight - padding - 5} fill="var(--text-dim)" fontSize="10" fontFamily="var(--font-mono)">
            PLAINS / MASTERED (20m)
          </text>

          {/* Terrain Area Fill */}
          <path d={areaStr} className="terrain-fill-area" />

          {/* Smoothed Terrain Spline Contour */}
          <path d={pathStr} stroke="url(#stroke-gradient)" className="terrain-contour-stroke" />

          {/* Interactive Summit / Beacon Points */}
          {plotPoints.map((item, idx) => {
            const isHovered = hoveredPoint && hoveredPoint.pt.topic === item.pt.topic;
            let beaconColor = "var(--accent-cyan)";
            if (item.pt.status === "CRITICAL") beaconColor = "var(--accent-rose)";
            else if (item.pt.status === "NEEDS_REVIEW") beaconColor = "var(--accent-amber)";
            else if (item.pt.status === "MASTERED") beaconColor = "var(--accent-emerald)";

            return (
              <g
                key={idx}
                className="terrain-beacon-group"
                tabIndex={0}
                role="button"
                aria-label={`Topic: ${item.pt.topic}, Status: ${item.pt.status}`}
                onMouseEnter={() => setHoveredPoint(item)}
                onMouseLeave={() => setHoveredPoint(null)}
                onFocus={() => setHoveredPoint(item)}
                onBlur={() => setHoveredPoint(null)}
              >
                {/* Outer radar ripple ring on hover */}
                {isHovered && (
                  <circle
                    cx={item.x}
                    cy={item.y}
                    r={14}
                    fill="none"
                    stroke={beaconColor}
                    strokeWidth={1}
                    opacity={0.6}
                    strokeDasharray="2 2"
                  />
                )}
                {/* Elevation Beacon Anchor Line to Base */}
                <line
                  x1={item.x}
                  y1={item.y}
                  x2={item.x}
                  y2={svgHeight - padding}
                  stroke="rgba(28, 48, 88, 0.5)"
                  strokeDasharray="2 2"
                />
                {/* Beacon Core */}
                <circle
                  cx={item.x}
                  cy={item.y}
                  r={isHovered ? 7 : 5}
                  className="terrain-beacon-outer"
                  stroke={beaconColor}
                />
                <circle
                  cx={item.x}
                  cy={item.y}
                  r={isHovered ? 4 : 2.5}
                  fill={beaconColor}
                  className="terrain-beacon-inner"
                />
                {/* Topic label below axis */}
                <text
                  x={item.x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  fill={isHovered ? "var(--text-pure)" : "var(--text-muted)"}
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  fontWeight={isHovered ? "600" : "400"}
                >
                  {item.pt.topic.split(" ")[0]}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Telemetry Card */}
        {hoveredPoint && (
          <div className="terrain-tooltip" style={{ pointerEvents: "none" }}>
            <div className="tooltip-topic">{hoveredPoint.pt.topic}</div>
            <div className="tooltip-stats">
              <div>
                Elevation Index:{" "}
                <strong style={{ color: "var(--accent-cyan)" }}>
                  {hoveredPoint.pt.elevation}m
                </strong>
              </div>
              <div>
                Recency Accuracy:{" "}
                <strong style={{ color: hoveredPoint.pt.accuracy < 50 ? "var(--accent-rose)" : "var(--accent-emerald)" }}>
                  {hoveredPoint.pt.accuracy}%
                </strong>
              </div>
              <div>
                Status:{" "}
                <span className={`urgency-badge urgency-${hoveredPoint.pt.status.toLowerCase()}`}>
                  {hoveredPoint.pt.status}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

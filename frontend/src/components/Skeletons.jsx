import React from "react";

export function GaugeSkeleton() {
  return (
    <div className="skeleton-box skeleton-gauge-card" aria-label="Loading readiness dial" />
  );
}

export function TerrainSkeleton() {
  return (
    <div className="skeleton-box skeleton-terrain-card" aria-label="Loading weakness terrain curve" />
  );
}

export function TableSkeleton() {
  return (
    <div className="skeleton-box skeleton-table-card" aria-label="Loading topic breakdown" />
  );
}

export function RunwaySkeleton() {
  return (
    <div className="runway-days-grid" aria-label="Loading 7-day revision runway">
      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
        <div key={n} className="skeleton-box skeleton-day-card" />
      ))}
    </div>
  );
}

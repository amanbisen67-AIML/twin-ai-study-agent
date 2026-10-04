import React from "react";
import { Activity, Compass, Calendar, PlusCircle, RefreshCw, Terminal } from "lucide-react";

export function Header({
  activeView,
  onViewChange,
  onOpenAttemptModal,
  onSyncLeetCode,
  isSyncingScraper,
  studentName = "Alex Chen",
  targetRole = "Java Backend / DSA Candidate"
}) {
  return (
    <header className="instrument-header">
      <div className="brand-section">
        <div className="twin-icon-beacon" aria-hidden="true">
          <Activity size={20} />
        </div>
        <div>
          <div className="brand-title">
            TWIN <span style={{ color: "var(--accent-cyan)", fontSize: "0.9rem" }}>// 2.0</span>
          </div>
          <div className="brand-tagline">Digital Twin AI Study Agent</div>
        </div>
      </div>

      {/* View Switcher */}
      <nav className="view-switcher-nav" aria-label="Main Navigation">
        <button
          type="button"
          className={`nav-tab-btn ${activeView === "dashboard" ? "active" : ""}`}
          onClick={() => onViewChange("dashboard")}
        >
          <Compass size={16} />
          Telemetry Dashboard
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeView === "plan" ? "active" : ""}`}
          onClick={() => onViewChange("plan")}
        >
          <Calendar size={16} />
          7-Day Runway
        </button>
      </nav>

      {/* Right Actions & Status */}
      <div className="telemetry-status-group">
        <div className="telemetry-chip" title="Active Study Profile">
          <div className="pulse-dot" />
          <span style={{ color: "var(--text-pure)", fontWeight: 500 }}>{studentName}</span>
          <span style={{ color: "var(--text-dim)" }}>|</span>
          <span style={{ color: "var(--accent-cyan)" }}>Java DSA</span>
        </div>

        <button
          type="button"
          className="action-btn-secondary"
          onClick={onSyncLeetCode}
          disabled={isSyncingScraper}
          title="Scrape and sync latest LeetCode Java question patterns"
        >
          <RefreshCw size={14} className={isSyncingScraper ? "animate-spin" : ""} />
          {isSyncingScraper ? "Scraping..." : "Sync LeetCode"}
        </button>

        <button
          type="button"
          className="action-btn-primary"
          onClick={onOpenAttemptModal}
          title="Log a quiz attempt to train the twin"
        >
          <PlusCircle size={15} />
          Log Attempt
        </button>
      </div>
    </header>
  );
}

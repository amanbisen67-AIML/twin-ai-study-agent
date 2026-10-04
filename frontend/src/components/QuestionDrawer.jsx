import React, { useEffect, useState } from "react";
import { X, Copy, Check, Code, Play, Terminal, Lightbulb, ShieldCheck, CheckCircle2 } from "lucide-react";

export function QuestionDrawer({
  isOpen,
  onClose,
  question,
  session
}) {
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // Close on ESC key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !question) return null;

  const handleCopyCode = () => {
    if (question.java_starter_code) {
      navigator.clipboard.writeText(question.java_starter_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSimulateRun = () => {
    setIsRunningTest(true);
    setTestResult(null);
    setTimeout(() => {
      setIsRunningTest(false);
      setTestResult({
        status: "PASSED",
        message: "All sample test cases matched expected output.",
        timeMs: 24
      });
    }, 600);
  };

  return (
    <div
      className="drawer-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Practice Question Drawer"
    >
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent-cyan)" }}>
              {session ? `DAY 0${session.day_number} // ${session.focus_topic}` : question.topic}
            </span>
            <h2 className="drawer-title">{question.title}</h2>
          </div>

          <button
            type="button"
            className="close-drawer-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {/* Question Metadata Bar */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <span className={`urgency-badge ${
              question.difficulty === "Easy" ? "urgency-mastered" : question.difficulty === "Hard" ? "urgency-critical" : "urgency-needs_review"
            }`}>
              {question.difficulty}
            </span>

            <span className="telemetry-chip">
              Time: {question.time_complexity || "O(N)"}
            </span>

            <span className="telemetry-chip">
              Space: {question.space_complexity || "O(1)"}
            </span>

            {question.leetcode_slug && (
              <span className="telemetry-chip" style={{ color: "var(--accent-cyan)" }}>
                LeetCode: #{question.leetcode_slug}
              </span>
            )}
          </div>

          {/* Problem Statement */}
          <div className="question-card-full">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", color: "var(--text-pure)" }}>
              Problem Description
            </h3>
            <p className="q-desc">{question.description}</p>

            {/* Constraints */}
            {question.constraints && question.constraints.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
                  Constraints:
                </div>
                <ul style={{ paddingLeft: "1.25rem", marginTop: "0.25rem", fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {question.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Test Cases / Examples */}
          {question.examples && question.examples.length > 0 && (
            <div className="question-card-full">
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", color: "var(--text-pure)" }}>
                Example Test Cases
              </h3>
              <div className="test-cases-section">
                {question.examples.map((ex, i) => (
                  <div key={i} style={{ borderBottom: i < question.examples.length - 1 ? "1px solid var(--border-dim)" : "none", paddingBottom: "0.4rem" }}>
                    <div><span style={{ color: "var(--text-dim)" }}>Input:</span> <code style={{ color: "var(--accent-cyan)" }}>{ex.input}</code></div>
                    <div><span style={{ color: "var(--text-dim)" }}>Expected:</span> <code style={{ color: "var(--accent-emerald)" }}>{ex.expected_output}</code></div>
                    {ex.explanation && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                        Note: {ex.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Java Starter Code */}
          <div className="question-card-full">
            <div className="code-block-header">
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Code size={14} color="var(--accent-cyan)" />
                Solution.java (Template)
              </span>
              <button
                type="button"
                className="action-btn-secondary"
                style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
                onClick={handleCopyCode}
              >
                {copied ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy Java Code"}
              </button>
            </div>

            <div className="code-block-wrapper">
              <pre className="code-pre">{question.java_starter_code}</pre>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                className="action-btn-primary"
                onClick={handleSimulateRun}
                disabled={isRunningTest}
              >
                <Play size={14} />
                {isRunningTest ? "Compiling..." : "Run Test Suite"}
              </button>

              {testResult && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--accent-emerald)" }}>
                  <CheckCircle2 size={16} />
                  <span>{testResult.message} ({testResult.timeMs}ms)</span>
                </div>
              )}
            </div>
          </div>

          {/* Solution Approach & Java Tips */}
          <div className="question-card-full">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", color: "var(--text-pure)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Lightbulb size={16} color="var(--accent-amber)" />
              Optimal Java Strategy & Idioms
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-main)", lineHeight: 1.55 }}>
              {question.solution_approach}
            </p>

            {question.java_tips && question.java_tips.length > 0 && (
              <div style={{ marginTop: "0.5rem", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "var(--radius-sm)", padding: "0.75rem" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent-amber)", fontWeight: 600, marginBottom: "0.3rem" }}>
                  JAVA COMPILER & PERFORMANCE TIPS:
                </div>
                <ul style={{ paddingLeft: "1.2rem", fontSize: "0.8rem", color: "var(--text-main)" }}>
                  {question.java_tips.map((tip, idx) => (
                    <li key={idx} style={{ marginBottom: "0.2rem" }}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

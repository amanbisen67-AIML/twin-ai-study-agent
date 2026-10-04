import React, { useState } from "react";
import { X, PlusCircle, CheckCircle, AlertCircle } from "lucide-react";

const TOPICS = [
  "Dynamic Programming",
  "Graphs & BFS/DFS",
  "Trees & Binary Search Trees",
  "Binary Search",
  "Sliding Window",
  "Stack & Monotonic Queue",
  "Arrays & Hashing",
  "Two Pointers"
];

export function AttemptModal({ isOpen, onClose, onLogAttempt }) {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [questionTitle, setQuestionTitle] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeTaken, setTimeTaken] = useState(120);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = questionTitle.trim() || `${topic} Rapid Drill`;
    const qId = `q_${topic.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;
    
    setIsSubmitting(true);
    try {
      await onLogAttempt({
        topic,
        question_id: qId,
        question_title: title,
        is_correct: isCorrect,
        time_taken_seconds: Number(timeTaken)
      });
      setQuestionTitle("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PlusCircle size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontFamily: "var(--font-display)", color: "var(--text-pure)" }}>
              Log Quiz Attempt (Train Twin)
            </h3>
          </div>
          <button
            type="button"
            className="close-drawer-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Curriculum Topic</label>
              <select
                className="form-select"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {TOPICS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Problem / Question Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Coin Change, Course Schedule..."
                value={questionTitle}
                onChange={(e) => setQuestionTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Outcome Result</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <button
                  type="button"
                  className={`action-btn-secondary ${isCorrect ? "active" : ""}`}
                  style={{
                    borderColor: isCorrect ? "var(--accent-emerald)" : "var(--border-line)",
                    background: isCorrect ? "rgba(16, 185, 129, 0.15)" : "var(--bg-panel)",
                    color: isCorrect ? "var(--accent-emerald)" : "var(--text-muted)",
                    justifyContent: "center"
                  }}
                  onClick={() => setIsCorrect(true)}
                >
                  <CheckCircle size={15} />
                  Solved Correctly
                </button>

                <button
                  type="button"
                  className={`action-btn-secondary ${!isCorrect ? "active" : ""}`}
                  style={{
                    borderColor: !isCorrect ? "var(--accent-rose)" : "var(--border-line)",
                    background: !isCorrect ? "rgba(244, 63, 94, 0.15)" : "var(--bg-panel)",
                    color: !isCorrect ? "var(--accent-rose)" : "var(--text-muted)",
                    justifyContent: "center"
                  }}
                  onClick={() => setIsCorrect(false)}
                >
                  <AlertCircle size={15} />
                  Incorrect / Missed
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Time Spent (Seconds)</label>
              <input
                type="number"
                className="form-input"
                min="10"
                max="1800"
                value={timeTaken}
                onChange={(e) => setTimeTaken(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="action-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="action-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Training Twin..." : "Log Attempt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

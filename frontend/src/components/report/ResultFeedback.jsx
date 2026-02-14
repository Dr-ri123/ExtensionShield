import React, { useState } from "react";
import "./ResultFeedback.scss";

/**
 * ResultFeedback - Per-scan feedback component
 * Allows users to rate whether a scan result was helpful
 * with optional follow-up details for negative feedback.
 */

const FEEDBACK_REASONS = [
  { value: "false_positive", label: "False positive (flagged something safe)" },
  { value: "false_negative", label: "False negative (missed something risky)" },
  { value: "score_off", label: "Score seems wrong" },
  { value: "unclear", label: "Results unclear" },
  { value: "other", label: "Other" },
];

const ResultFeedback = ({ scanId }) => {
  const [state, setState] = useState("initial"); // initial | expanded | submitting | success | error
  const [helpful, setHelpful] = useState(null);
  const [reason, setReason] = useState(null);
  const [suggestedScore, setSuggestedScore] = useState(50);
  const [comment, setComment] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const baseURL = import.meta.env.VITE_API_URL || "";

  const submitFeedback = async (isHelpful, feedbackReason = null) => {
    setState("submitting");
    setErrorMessage("");

    const payload = {
      scan_id: scanId,
      helpful: isHelpful,
    };

    if (!isHelpful && feedbackReason) {
      payload.reason = feedbackReason;
      if (feedbackReason === "score_off") {
        payload.suggested_score = suggestedScore;
      }
      if (feedbackReason === "other" && comment.trim()) {
        payload.comment = comment.trim().slice(0, 280);
      }
    }

    try {
      const response = await fetch(`${baseURL}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setState("success");
      } else {
        const data = await response.json().catch(() => ({}));
        setErrorMessage(data.detail || "Failed to submit feedback");
        setState("error");
      }
    } catch (err) {
      setErrorMessage("Network error. Please try again.");
      setState("error");
    }
  };

  const handleThumbsUp = () => {
    setHelpful(true);
    submitFeedback(true);
  };

  const handleThumbsDown = () => {
    setHelpful(false);
    setState("expanded");
  };

  const handleSubmitNegative = () => {
    if (!reason) return;
    submitFeedback(false, reason);
  };

  const handleReset = () => {
    setState("initial");
    setHelpful(null);
    setReason(null);
    setSuggestedScore(50);
    setComment("");
    setErrorMessage("");
  };

  // Success state
  if (state === "success") {
    return (
      <div className="result-feedback result-feedback--success">
        <span className="result-feedback__icon">✓</span>
        <span className="result-feedback__text">Thanks — saved.</span>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="result-feedback result-feedback--error">
        <span className="result-feedback__text">{errorMessage}</span>
        <button
          type="button"
          className="result-feedback__retry"
          onClick={handleReset}
        >
          Try again
        </button>
      </div>
    );
  }

  // Submitting state
  if (state === "submitting") {
    return (
      <div className="result-feedback result-feedback--submitting">
        <span className="result-feedback__spinner" />
        <span className="result-feedback__text">Saving...</span>
      </div>
    );
  }

  // Expanded state (negative feedback form)
  if (state === "expanded") {
    return (
      <div className="result-feedback result-feedback--expanded">
        <div className="result-feedback__header">
          <span className="result-feedback__label">What went wrong?</span>
        </div>
        
        <div className="result-feedback__reasons">
          {FEEDBACK_REASONS.map((r) => (
            <label key={r.value} className="result-feedback__reason">
              <input
                type="radio"
                name="feedback-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
              />
              <span className="result-feedback__reason-label">{r.label}</span>
            </label>
          ))}
        </div>

        {reason === "score_off" && (
          <div className="result-feedback__score-input">
            <label className="result-feedback__score-label">
              What score would you expect? <span className="result-feedback__score-value">{suggestedScore}</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={suggestedScore}
              onChange={(e) => setSuggestedScore(parseInt(e.target.value, 10))}
              className="result-feedback__slider"
            />
          </div>
        )}

        {reason === "other" && (
          <div className="result-feedback__comment-input">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us more (optional, max 280 chars)"
              maxLength={280}
              rows={2}
              className="result-feedback__textarea"
            />
            <span className="result-feedback__char-count">
              {comment.length}/280
            </span>
          </div>
        )}

        <div className="result-feedback__actions">
          <button
            type="button"
            className="result-feedback__btn result-feedback__btn--secondary"
            onClick={handleReset}
          >
            Cancel
          </button>
          <button
            type="button"
            className="result-feedback__btn result-feedback__btn--primary"
            onClick={handleSubmitNegative}
            disabled={!reason}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  // Initial state
  return (
    <div className="result-feedback">
      <span className="result-feedback__label">Was this result helpful?</span>
      <div className="result-feedback__buttons">
        <button
          type="button"
          className="result-feedback__btn result-feedback__btn--thumb"
          onClick={handleThumbsUp}
          title="Yes, helpful"
        >
          <span className="result-feedback__thumb-icon">👍</span>
          <span>Yes</span>
        </button>
        <button
          type="button"
          className="result-feedback__btn result-feedback__btn--thumb"
          onClick={handleThumbsDown}
          title="No, not helpful"
        >
          <span className="result-feedback__thumb-icon">👎</span>
          <span>No</span>
        </button>
      </div>
    </div>
  );
};

export default ResultFeedback;

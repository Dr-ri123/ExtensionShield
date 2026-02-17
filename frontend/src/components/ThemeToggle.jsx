/**
 * ThemeToggle – Day/night mode switch.
 * Modular: depends only on ThemeContext (useTheme). Optional onToggle for closing mobile menu.
 */
import React from "react";
import { useTheme } from "../context/ThemeContext";
import "./ThemeToggle.scss";

export default function ThemeToggle({ onToggle }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  const handleClick = () => {
    toggleTheme();
    onToggle?.();
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={handleClick}
      aria-label={isLight ? "Switch to night mode" : "Switch to day mode"}
      title={isLight ? "Night mode" : "Day mode"}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {isLight ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        )}
      </span>
    </button>
  );
}

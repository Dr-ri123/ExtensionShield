import React from "react";

const SourcesBox = ({ sources }) => {
  return (
    <div className="sources-box">
      <h4 className="sources-box__title">Data Sources</h4>
      <div className="sources-box__list">
        {sources.map((source, index) => (
          <div key={index} className="sources-box__item">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="sources-box__link"
            >
              {source.name}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
            <p className="sources-box__desc">{source.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SourcesBox;


import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "./BlogPage.scss";

const BlogPage = () => {
  // Placeholder blog posts - would come from CMS/API in production
  const posts = [
    {
      id: "welcome",
      title: "Welcome to ExtensionShield",
      date: "February 2026",
      excerpt: "Introducing ExtensionShield: an open-source tool for analyzing Chrome extension security, privacy, and governance risks.",
      category: "Announcement"
    }
  ];

  return (
    <>
      <Helmet>
        <title>Blog | ExtensionShield</title>
        <meta name="description" content="ExtensionShield blog: updates, tutorials, security research, and deep dives on browser extension threats." />
        <link rel="canonical" href="https://extensionshield.com/gsoc/blog" />
      </Helmet>

      <div className="blog-page">
        <div className="blog-bg">
          <div className="bg-gradient" />
        </div>

        <div className="blog-content">
          <header className="blog-header">
            <h1>Blog</h1>
            <p>
              Updates, tutorials, and research on browser extension security.
            </p>
          </header>

          <div className="blog-list">
            {posts.map((post) => (
              <article key={post.id} className="blog-card">
                <div className="blog-meta">
                  <span className="category-badge">{post.category}</span>
                  <span className="date">{post.date}</span>
                </div>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
              </article>
            ))}
          </div>

          <div className="blog-empty-cta">
            <h3>More content coming soon!</h3>
            <p>
              We're just getting started. Follow us on GitHub for updates.
            </p>
            <a 
              href="https://github.com/Stanzin7/ExtensionShield" 
              target="_blank" 
              rel="noopener noreferrer"
              className="cta-button"
            >
              Follow on GitHub
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogPage;


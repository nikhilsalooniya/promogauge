
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  content_html TEXT NOT NULL,
  featured_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at DATETIME,
  seo_title TEXT,
  seo_description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published_at ON posts(published_at);

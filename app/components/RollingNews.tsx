"use client";

import { useEffect, useState } from "react";

interface NewsItem {
  category: string;
  title: string;
  link?: string;
  date: string;
}

interface RollingNewsProps {
  className?: string;
}

const RollingNews: React.FC<RollingNewsProps> = ({ className = "" }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/newsletter");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
          setNews(result.data.items);
        }
      } catch (error) {
        console.error("Failed to fetch news:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  useEffect(() => {
    if (news.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % news.length);
    }, 3000); // 3초마다 변경

    return () => clearInterval(interval);
  }, [news.length]);

  if (loading) {
    return (
      <div className={`rolling-news ${className}`}>
        <div className="rolling-news__icon">📰</div>
        <div className="rolling-news__content">
          <div className="rolling-news__loading">뉴스 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return null;
  }

  const currentNews = news[currentIndex];

  return (
    <div className={`rolling-news ${className}`}>
      <div className="rolling-news__icon">📰</div>
      <div className="rolling-news__content">
        <div className="rolling-news__category">{currentNews.category}</div>
        <div className="rolling-news__title">
          {currentNews.link ? (
            <a
              href={currentNews.link}
              target="_blank"
              rel="noopener noreferrer"
              className="rolling-news__link"
            >
              {currentNews.title}
            </a>
          ) : (
            <a
              href="https://ziply-nine.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="rolling-news__link"
            >
              {currentNews.title}
            </a>
          )}
        </div>
      </div>
      <div className="rolling-news__indicator">
        {news.map((_, index) => (
          <div
            key={index}
            className={`rolling-news__dot ${
              index === currentIndex ? "active" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default RollingNews;

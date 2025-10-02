"use client";

import { useNews } from "../providers/NewsProvider";

interface NewsTickerProps {
  className?: string;
}

const NewsTicker: React.FC<NewsTickerProps> = ({ className = "" }) => {
  const { news, loading, currentIndex } = useNews();

  if (loading) {
    return (
      <div className={`news-ticker ${className}`}>
        <div className="news-ticker__icon">📰</div>
        <div className="news-ticker__content">
          <div className="news-ticker__loading">뉴스 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return null;
  }

  const currentNews = news[currentIndex];

  return (
    <div className={`news-ticker ${className}`}>
      <div className="news-ticker__icon">📰</div>
      <div className="news-ticker__content">
        <div className="news-ticker__category">{currentNews.category}</div>
        <div className="news-ticker__title">
          {currentNews.link ? (
            <a
              href={currentNews.link}
              target="_blank"
              rel="noopener noreferrer"
              className="news-ticker__link"
            >
              {currentNews.title}
            </a>
          ) : (
            <a
              href="https://ziply-nine.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="news-ticker__link"
            >
              {currentNews.title}
            </a>
          )}
        </div>
      </div>
      <div className="news-ticker__indicator">
        {news.map((_, index) => (
          <div
            key={index}
            className={`news-ticker__dot ${
              index === currentIndex ? "active" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default NewsTicker;

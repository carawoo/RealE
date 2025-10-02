"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface NewsItem {
  category: string;
  title: string;
  link?: string;
  date?: string;
  summary?: string;
  glossary?: string;
}

interface NewsContextType {
  news: NewsItem[];
  loading: boolean;
  error: string | null;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  refreshNews: () => void;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export const useNews = () => {
  const context = useContext(NewsContext);
  if (!context) {
    throw new Error("useNews must be used within a NewsProvider");
  }
  return context;
};

interface NewsProviderProps {
  children: ReactNode;
}

export const NewsProvider = ({ children }: NewsProviderProps) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/newsletter");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setNews(result.data.items);
      } else {
        throw new Error("Failed to fetch news");
      }
    } catch (err) {
      console.error("Failed to fetch news:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const refreshNews = () => {
    fetchNews();
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // 자동 슬라이드 (4초마다)
  useEffect(() => {
    if (news.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % news.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [news.length]);

  const value = {
    news,
    loading,
    error,
    currentIndex,
    setCurrentIndex,
    refreshNews,
  };

  return (
    <NewsContext.Provider value={value}>
      {children}
    </NewsContext.Provider>
  );
};

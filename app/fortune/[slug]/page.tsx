// app/fortune/[slug]/page.tsx
// 공유된 부동산 사주 페이지

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import "../../fortune/fortune.css";
import "./share.css";

export const revalidate = 0;

interface FortuneLog {
  id: string;
  property_name: string;
  property_type?: string;
  property_price?: string;
  user_name?: string;
  fortune_text: string;
  fortune_keywords: string[];
  image_url?: string;
  created_at: string;
}

// OG 메타 태그 생성
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = params;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return {
      title: "부동산 사주 | Real-E",
    };
  }

  const supabase = createClient(url, anon);
  const { data } = await supabase
    .from("fortune_log")
    .select("*")
    .eq("share_slug", slug)
    .single();

  if (!data) {
    return {
      title: "부동산 사주를 찾을 수 없습니다 | Real-E",
    };
  }

  const keywords = data.fortune_keywords?.join(" · ") || "부동산 사주";
  const title = `${data.property_name} 부동산 사주 🔮`;
  const description = `${keywords}\n\nReal-E에서 우리 집의 운세를 확인해보세요!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: data.image_url
        ? [
            {
              url: data.image_url,
              width: 1024,
              height: 1024,
              alt: `${data.property_name} 부동산 사주`,
            },
          ]
        : [],
      type: "website",
      siteName: "Real-E",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: data.image_url ? [data.image_url] : [],
    },
  };
}

export default async function FortuneSharePage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return (
      <main className="fortune-share-wrap">
        <div className="fortune-share-error">
          <h1>환경 설정 문제</h1>
          <p>데이터베이스 환경 변수가 설정되지 않았습니다.</p>
          <Link href="/" className="btn primary">
            홈으로
          </Link>
        </div>
      </main>
    );
  }

  const supabase = createClient(url, anon);

  const { data, error } = await supabase
    .from("fortune_log")
    .select("*")
    .eq("share_slug", slug)
    .single();

  if (error || !data) {
    console.error("Fortune not found:", { error, slug });
    return notFound();
  }

  const fortune: FortuneLog = data;

  // 조회수 증가 (비동기로 처리, 에러는 무시)
  fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/fortune/share?slug=${slug}`)
    .catch(() => {});

  return (
    <main className="fortune-share-wrap">
      <div className="fortune-share-container">
        <header className="fortune-share-header">
          <h1>🔮 {fortune.property_name}의 사주</h1>
          <div className="fortune-share-meta">
            {fortune.property_type && <span>{fortune.property_type}</span>}
            {fortune.property_price && <span>{fortune.property_price}</span>}
          </div>
        </header>

        <div className="fortune-share-keywords">
          {fortune.fortune_keywords?.map((keyword, idx) => (
            <span key={idx} className="fortune-keyword">
              {keyword}
            </span>
          ))}
        </div>

        {fortune.image_url && (
          <div className="fortune-share-image">
            <img src={fortune.image_url} alt="타로 카드" />
          </div>
        )}

        <div className="fortune-share-text">
          {fortune.fortune_text.split('\n').map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>

        <div className="fortune-share-disclaimer">
          ※ 본 콘텐츠는 오직 재미용으로 제공되며 실제 투자 및 매매 판단과는 무관합니다.
        </div>

        <div className="fortune-share-actions">
          <Link href="/chat" className="btn primary">
            나도 부동산 사주 보기 🔮
          </Link>
          <Link href="/" className="btn secondary">
            Real-E 홈으로
          </Link>
        </div>

        <footer className="fortune-share-footer">
          <p>
            생성일: {new Date(fortune.created_at).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p>상담자: 리얼이(RealE)</p>
        </footer>
      </div>
    </main>
  );
}


import "./global.css";
import GlobalNav from "./GlobalNav";
import AuthProvider from "./providers/AuthProvider";
import { NewsProvider } from "./providers/NewsProvider";
import NewsTicker from "./components/NewsTicker";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.real-e.space";

export const metadata = {
  title: "RealE - 부동산 대출 AI 비서",
  description: "부동산·금융·인테리어 전문가가 실시간으로 답변합니다. 대출 시나리오 비교, 정책 매칭, 프리랜서 소득증명 상담까지.",
  icons: {
    icon: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "RealE",
    title: "RealE - 부동산 대출 AI 비서",
    description:
      "부동산·금융·인테리어 전문가가 실시간으로 답변합니다. 대출 시나리오 비교, 정책 매칭, 프리랜서 소득증명 상담까지.",
    images: [
      {
        url: `${SITE_URL}/realE-logo.png`,
        width: 512,
        height: 512,
        alt: "RealE"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "RealE - 부동산 대출 AI 비서",
    description:
      "부동산·금융·인테리어 전문가가 실시간으로 답변합니다. 대출 시나리오 비교, 정책 매칭, 프리랜서 소득증명 상담까지.",
    images: [`${SITE_URL}/realE-logo.png`]
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <meta name="google-site-verification" content="y6oCIZ8CC_KX6RY3XZW3wn07-lhvnsYCrbLwAayqBuI" />
        <meta name="naver-site-verification" content="c39fcbee55418ddb546b452d9ea47e98f1b1ca17" />
        <meta name="google-adsense-account" content="ca-pub-2510776388416939" />
        {/* Fallback favicon links for browsers that don't read metadata.icons */}
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
          <script async src="https://js.stripe.com/v3" />
        )}
        {/* Kakao Share SDK */}
        <script 
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          async
          crossOrigin="anonymous"
        />
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2510776388416939"
          crossOrigin="anonymous"
        />
        {/* Kakao Maps SDK */}
        <script 
          src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=087319e261444450882a1a155abea088&autoload=false&libraries=services"
          async
        />
      </head>
      <body className="app-shell">
        <AuthProvider>
          <NewsProvider>
            <GlobalNav />
            <NewsTicker />
            <main className="page-container">{children}</main>
            <footer className="app-footer">
              <div className="app-footer__inner">
                <span>문의 : <a href="mailto:2025reale@gmail.com">2025reale@gmail.com</a></span>
                <a className="app-footer__policy" href="/privacy">
                  개인정보 처리방침
                </a>
              </div>
            </footer>
          </NewsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

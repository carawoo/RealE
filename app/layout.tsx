import "./global.css";
import GlobalNav from "./GlobalNav";
import AuthProvider from "./providers/AuthProvider";

export const metadata = {
  title: "RealE",
  description: "MVP",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
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
        {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
          <script async src="https://js.stripe.com/v3" />
        )}
      </head>
      <body className="app-shell">
        <AuthProvider>
          <GlobalNav />
          <main className="page-container">{children}</main>
          <footer className="app-footer">
            <div className="app-footer__inner">
              <span>문의 : <a href="mailto:2025reale@gmail.com">2025reale@gmail.com</a></span>
              <a className="app-footer__policy" href="/privacy">
                개인정보 처리방침
              </a>
            </div>
            <div className="business-meta">
              상호명 뚝딱컴퍼니 · 대표자 김재환 · 주소 경기도 안산시 단원구 광덕2로 17, 1316동 304호(초지동, 그린빌주공13단지아파트) · 사업자등록번호 854-52-00876 · 대표전화번호 01025923007 · 대표이메일 2025reale@gmail.com
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}

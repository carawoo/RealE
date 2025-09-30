import "./global.css";
import GlobalNav from "./GlobalNav";
import AuthProvider from "./providers/AuthProvider";

export const metadata = {
  title: "RealE",
  description: "MVP"
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

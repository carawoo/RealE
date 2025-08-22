// app/layout.tsx
export const metadata = { 
  title: "RealE", 
  description: "MVP" 
};

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html lang="ko">
      <head>
        <meta name="google-site-verification" content="y1Syyb9kLbVHWAxtFK5oRlOG3Llq_EIVUU4Nuq_el1Y" />
      </head>
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <nav className="nav" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px" }}>
          <a className="brand" href="/" style={{ textDecoration: "none", fontWeight: 700 }}>
            <span className="logo">🏠</span> RealE
          </a>
          <div className="nav-actions" style={{ display: "flex", gap: 8 }}>
            <a className="btn ghost" href="/faq">FAQ</a>
            <a className="btn primary" href="/chat">상담 시작</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}

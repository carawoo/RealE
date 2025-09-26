import "./global.css";
import GlobalNav from "./GlobalNav";

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
        <meta name="google-site-verification" content="y1Syyb9kLbVHWAxtFK5oRlOG3Llq_EIVUU4Nuq_el1Y" />
      </head>
      <body className="app-shell">
        <GlobalNav />
        <main className="page-container">{children}</main>
      </body>
    </html>
  );
}

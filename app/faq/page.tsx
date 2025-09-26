// app/faq/page.tsx
import { FAQ } from "@/app/data/faqs";
import "../global.css";

export const metadata = { title: "FAQ - RealE" };

export default function FAQPage() {
  return (
    <section className="page-container">
      <div className="surface" style={{ width: "min(100%, 720px)", gap: 24 }}>
        <header className="home-hero" style={{ textAlign: "left" }}>
          <h1>자주 묻는 질문</h1>
          <p>정책·상품은 언제든지 바뀔 수 있어요. 최신 공고와 은행 안내를 함께 확인해 주세요.</p>
        </header>

        <ul className="steps" style={{ display: "grid", gap: 18, listStyle: "none", padding: 0, margin: 0 }}>
          {FAQ.map((item, index) => (
            <li
              key={item.q}
              className="surface"
              style={{
                background: "#f8f9fb",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                borderRadius: 20,
                padding: "20px 22px",
                display: "grid",
                gap: 12,
                boxShadow: "0 18px 38px rgba(15, 23, 42, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #1a73e8, #4285f4)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  {index + 1}
                </span>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#1f2933" }}>{item.q}</h2>
              </div>
              <p style={{ margin: 0, color: "#4a5568", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{item.a}</p>
            </li>
          ))}
        </ul>

        <footer style={{ textAlign: "center", color: "#6b7280", fontSize: 13 }}>
          © {new Date().getFullYear()} RealE 상담 안내
        </footer>
      </div>
    </section>
  );
}
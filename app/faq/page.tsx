// app/faq/page.tsx
import { FAQ } from "@/app/data/faqs";
import "../global.css";

export const metadata = { title: "FAQ - RealE" };

export default function FAQPage() {
  return (
    <section className="page-container">
      <div className="surface faq-surface">
        <header className="home-hero faq-hero">
          <h1>자주 묻는 질문</h1>
          <p>정책·상품은 언제든지 바뀔 수 있어요. 최신 공고와 은행 안내를 함께 확인해 주세요.</p>
        </header>

        <ul className="faq-list">
          {FAQ.map((item, index) => (
            <li key={item.q} className="faq-item">
              <div className="faq-item__header">
                <span className="faq-item__index">{index + 1}</span>
                <h2>{item.q}</h2>
              </div>
              <p className="faq-item__body">{item.a}</p>
            </li>
          ))}
        </ul>

        <footer className="faq-footer">
          © {new Date().getFullYear()} RealE 상담 안내
        </footer>
      </div>
    </section>
  );
}
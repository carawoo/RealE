// app/faq/page.tsx
import { FAQ } from "@/app/data/faqs";
import "../home.css";

export const metadata = { title: "FAQ - RealE" };

export default function FAQPage() {
  return (
    <main className="home">

      <section className="hero">
        <h1><span className="accent">자주 묻는 질문</span></h1>
        <p className="lead">정책·상품은 수시로 바뀔 수 있어요. 최신 공고와 은행 안내를 함께 확인해 주세요.</p>
      </section>

      <section className="how" style={{maxWidth:960, margin:"0 auto 28px", padding:"0 20px"}}>
        <ul className="steps">
          {FAQ.map((f, i) => (
            <li key={i}>
              <span className="num">{i+1}</span>
              <div>
                <b>{f.q}</b>
                <p style={{whiteSpace:"pre-wrap"}}>{f.a}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="footer">© {new Date().getFullYear()} RealE</footer>
    </main>
  );
}
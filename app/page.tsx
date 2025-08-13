export default function Page() {
  return (
    <main style={{ margin: 0, padding: 0, height: "100vh" }}>
      <iframe
        src="/chat.html"
        style={{ border: "none", width: "100%", height: "100vh" }}
        title="RealE Chat"
      />
    </main>
  );
}

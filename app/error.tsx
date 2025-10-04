'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="surface" style={{ textAlign: 'center', padding: '2rem' }}>
      <h2>문제가 발생했습니다!</h2>
      <p>일시적인 오류가 발생했습니다. 다시 시도해주세요.</p>
      <button
        onClick={reset}
        className="nav-btn primary"
        style={{ marginTop: '1rem' }}
      >
        다시 시도
      </button>
    </div>
  )
}

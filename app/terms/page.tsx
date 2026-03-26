import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-display text-ink mb-4">Terms of Service</h1>
      <p className="text-sm text-stone mb-4">Effective date: March 2026</p>
      <div className="space-y-4 text-sm text-ink leading-6">
        <p>Use Tennis Scheduler responsibly. You are responsible for your account activity and for respectful conduct with other players.</p>
        <p>Do not post abusive content, impersonate others, or misuse booking, messaging, or group features.</p>
        <p>We may suspend accounts for safety, fraud, harassment, or policy violations.</p>
        <p>By using the app, you agree to these terms and our privacy policy.</p>
      </div>
      <Link href="/auth/signup" className="inline-block mt-6 text-terracotta underline">Back to sign up</Link>
    </main>
  )
}

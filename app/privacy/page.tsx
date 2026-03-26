import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-display text-ink mb-4">Privacy Policy</h1>
      <p className="text-sm text-stone mb-4">Effective date: March 2026</p>
      <div className="space-y-4 text-sm text-ink leading-6">
        <p>We collect account information, app usage data, and user-generated content needed to provide scheduling and social features.</p>
        <p>We do not sell personal data. We use service providers for authentication, storage, and communications.</p>
        <p>You can update your profile and notification settings in the app. You can request account deletion from settings.</p>
      </div>
      <Link href="/auth/signup" className="inline-block mt-6 text-terracotta underline">Back to sign up</Link>
    </main>
  )
}

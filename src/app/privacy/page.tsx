export const metadata = { title: 'Privacy · Monetizable' };

export default function Privacy() {
  return <main className="auth-screen"><a className="brand" href="/">Monetizable</a><article className="auth-card" style={{maxWidth:760}}>
    <span className="eyebrow">YOUR DATA, YOUR QUEST</span><h1>Privacy notice</h1><p>Updated October 13, 2026.</p>
    <h2>Account and learning data</h2><p>Monetizable uses your email address to identify your account. Google sign-in provides your basic account identity, including email and profile information. We do not request access to your Gmail messages, contacts or Google Drive files. Your saved predictions, reasons, learning answers, progress and account settings are stored so they can sync across devices.</p>
    <h2>Services that process data</h2><p>Supabase provides authentication and database storage. Vercel hosts the website and supplies web analytics. Email sign-in links are delivered through Resend. Stripe processes subscriptions and payment details; Monetizable stores Stripe customer and subscription identifiers and billing status, rather than your full card details.</p>
    <h2>Website operation</h2><p>Session cookies keep you signed in. Browser storage keeps local drafts and learning progress. Visit and usage records help measure website activity. Requests may also be processed for security and rate limiting. Public market reports are shared website content; account records are associated with your own account.</p>
    <h2>Your choices</h2><p>You can explore without signing in, sign out, or cancel a subscription through the billing portal. Contact <a href="mailto:liuxiaotong268@gmail.com">liuxiaotong268@gmail.com</a> to ask about your personal data or request account deletion. We may need to retain records required for billing, security or legal obligations.</p>
    <a className="google-sign-in" href="/auth">Return to sign-in</a>
  </article></main>;
}

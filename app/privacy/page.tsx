import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What OmniDesk AI collects, why, which services process it, and how to have it deleted.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="18 November 2026">
      <p>
        OmniDesk AI is a portfolio project that runs a real, working support desk. This page explains plainly what it stores and why. It is a good-faith
        summary, not legal advice.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Staff accounts:</b> your email address and a password (stored hashed by Supabase Auth), and the organizations you belong to.</li>
        <li><b>Customer conversations:</b> the name you type, your email if you choose to give one, and your messages and the replies to them.</li>
        <li><b>Knowledge:</b> the FAQs, text, PDFs, and web pages a business adds so the desk can answer from them.</li>
        <li><b>Abuse protection:</b> a one-way hash of your IP address, kept for up to two days to enforce rate limits. The raw address is not stored.</li>
        <li><b>Diagnostics:</b> error reports, with text and form inputs masked in session replays and request bodies excluded.</li>
      </ul>

      <h2>Why</h2>
      <p>
        Only to run the desk: answering questions from a business&apos;s approved knowledge, handing unanswered ones to its staff, emailing replies you asked
        for, keeping the service secure, and fixing errors. Nothing is sold, and nothing is used for advertising.
      </p>

      <h2>Who processes it</h2>
      <ul>
        <li><b>Supabase</b> (database and sign-in, hosted in Sydney, Australia).</li>
        <li><b>Google Gemini API</b> (reads a question and the matching approved passages to write an answer, and turns text into search embeddings).</li>
        <li><b>Vercel</b> (hosting) and <b>Vercel Web Analytics</b> (page-view counts without cookies).</li>
        <li><b>Cloudflare Turnstile</b> (checks that a visitor is human before a question is sent).</li>
        <li><b>Sentry</b> (error reports).</li>
        <li><b>n8n and the business&apos;s email provider</b> (sends escalation, reply, and invitation emails).</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Only essential cookies are used: the sign-in session for staff. Analytics is cookieless, and there is no advertising or cross-site tracking, so there
        is no cookie banner. The customer chat remembers your conversation in your own browser&apos;s storage so you can come back to it; the &ldquo;New
        conversation&rdquo; button clears it.
      </p>

      <h2>How long it is kept</h2>
      <p>
        Conversations and knowledge stay until the business deletes them or deletes its organization, which removes everything that belongs to it. Rate-limit
        records expire after two days.
      </p>

      <h2>Your choices</h2>
      <p>
        To see or delete your data, contact the business you talked to, or open an issue on the{" "}
        <a href="https://github.com/B1Kjuu/omnidesk-ai/issues" target="_blank" rel="noopener noreferrer">project&apos;s GitHub page</a>. Staff can delete
        knowledge, conversations, and organizations from the dashboard at any time.
      </p>
    </LegalPage>
  );
}

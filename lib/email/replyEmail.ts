import "server-only";

type ReplyEmailInput = {
  organizationName: string;
  customerName: string;
  question: string | null;
  reply: string;
  chatUrl: string;
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const font = "'Atkinson Hyperlegible',Arial,Helvetica,sans-serif";

/** The email a customer gets when staff reply. Same layout family as the escalation email. */
export function renderReplyEmail(input: ReplyEmailInput) {
  const subject = `${input.organizationName} replied to your question`;
  const firstName = input.customerName.split(/\s+/)[0] || "there";
  const replyHtml = escapeHtml(input.reply).replace(/\n/g, "<br>");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f2f4;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.reply.slice(0, 140))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f2f4;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #d9dce1;">
          <tr>
            <td style="background:#d0261d;padding:14px 24px;font:700 18px/1 ${font};color:#ffffff;">${escapeHtml(input.organizationName)}</td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <h1 style="margin:0 0 8px;font:700 24px/1.25 ${font};color:#15171a;">Hi ${escapeHtml(firstName)}, the team replied</h1>
              ${input.question ? `<p style="margin:0;font:400 15px/1.5 ${font};color:#4a515b;">You asked: &ldquo;${escapeHtml(input.question.length > 200 ? `${input.question.slice(0, 199)}…` : input.question)}&rdquo;</p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 4px;">
              <div style="border-left:4px solid #0f7b3f;background:#f1f2f4;padding:14px 16px;font:400 17px/1.55 ${font};color:#15171a;">${replyHtml}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="background:#d0261d;"><a href="${escapeHtml(input.chatUrl)}" style="display:inline-block;padding:12px 20px;font:700 16px/1 ${font};color:#ffffff;text-decoration:none;">Continue the conversation</a></td>
              </tr></table>
              <p style="margin:16px 0 0;font:400 14px/1.5 ${font};color:#4a515b;">You can also reply to this email.</p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #d9dce1;padding:16px 24px;font:400 13px/1.5 ${font};color:#4a515b;">
              Sent by ${escapeHtml(input.organizationName)} through OmniDesk because you asked a question on their help desk.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Hi ${firstName}, ${input.organizationName} replied to your question.`,
    "",
    input.question ? `You asked: ${input.question}` : "",
    "",
    input.reply,
    "",
    `Continue the conversation: ${input.chatUrl}`,
    "You can also reply to this email.",
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");

  return { subject, html, text };
}

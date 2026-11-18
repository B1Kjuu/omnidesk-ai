import { ImageResponse } from "next/og";

export const alt = "OmniDesk AI: customer support that answers only from approved knowledge, and hands everything else to a person.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The link preview shown on LinkedIn, X, Slack, and Messenger. Same departure-board look as the landing page. */
export default function OpenGraphImage() {
  const rows: Array<[string, string, string, string]> = [
    ["09:41", "How long do refunds take?", "Refund FAQ", "ANSWERED"],
    ["09:43", "Do you deliver to Cebu?", "Shipping policy", "ANSWERED"],
    ["09:44", "Can I get a bulk discount?", "—", "TO STAFF"],
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#101215", color: "#f4f5f6", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, background: "#d0261d", padding: "26px 56px", fontSize: 34, fontWeight: 700 }}>
          <div style={{ width: 44, height: 44, borderRadius: 6, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, border: "6px solid #d0261d" }} />
          </div>
          OmniDesk AI
        </div>
        <div style={{ display: "flex", flexDirection: "column", padding: "48px 56px 0" }}>
          <div style={{ fontSize: 66, fontWeight: 700, letterSpacing: -2, lineHeight: 1.02, maxWidth: 980 }}>Every answer leaves with its source.</div>
          <div style={{ marginTop: 18, fontSize: 28, color: "#b9bec6", maxWidth: 980 }}>
            Support that answers only from approved knowledge, and hands everything else to a person.
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 40, borderTop: "3px solid #f4f5f6" }}>
            {rows.map(([time, question, source, status]) => (
              <div key={time} style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #2c3036", fontSize: 26 }}>
                <div style={{ width: 110, color: "#ffd23f", fontWeight: 700 }}>{time}</div>
                <div style={{ flex: 1 }}>{question}</div>
                <div style={{ width: 240, color: "#b9bec6" }}>{source}</div>
                <div style={{ width: 160, display: "flex", justifyContent: "flex-end", fontWeight: 700, color: status === "ANSWERED" ? "#4ade80" : "#ffd23f" }}>{status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}

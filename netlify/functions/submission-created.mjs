import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatSubmission(data) {
  const lines = [];

  if (data.name) lines.push(`Name: ${data.name}`);
  if (data.email) lines.push(`Email: ${data.email}`);
  if (data.phone) lines.push(`Phone: ${data.phone}`);
  if (data.address) lines.push(`Address: ${data.address}`);
  if (data["city-state-zip"]) lines.push(`City/State/Zip: ${data["city-state-zip"]}`);

  const flags = [];
  if (data["new-here"] === "yes") flags.push("New visitor");
  if (data["update-info"] === "yes") flags.push("Update info");
  if (flags.length) lines.push(`\nStatus: ${flags.join(", ")}`);

  const steps = [];
  if (data.decision === "yes") steps.push("Made a decision to follow Christ");
  if (data.dgroup === "yes") steps.push("Wants to join a dGroup");

  // learn-about can be a string or array
  const learnAbout = data["learn-about"];
  if (learnAbout) {
    const items = Array.isArray(learnAbout) ? learnAbout : [learnAbout];
    items.forEach((item) => steps.push(item));
  }
  if (data["other-detail"]) steps.push(`Other: ${data["other-detail"]}`);

  if (steps.length) {
    lines.push("\nNext Steps:");
    steps.forEach((s) => lines.push(`  • ${s}`));
  }

  if (data.prayer) lines.push(`\nPrayer Request:\n${data.prayer}`);
  if (data.feedback) lines.push(`\nFeedback:\n${data.feedback}`);

  return lines.join("\n");
}

export async function handler(event) {
  const { payload } = JSON.parse(event.body);
  const data = payload.data;

  const formattedText = formatSubmission(data);
  const submitterName = data.name || "Anonymous";

  // Always send to connect@
  const emails = [
    resend.emails.send({
      from: "FPC Connect <noreply@connect.fpccorinth.org>",
      to: ["connect@fpccorinth.org"],
      subject: `Connect Card: ${submitterName}`,
      text: `New connect card submission:\n\n${formattedText}`,
    }),
  ];

  // If prayer request present, also send to prayer@
  if (data.prayer && data.prayer.trim()) {
    emails.push(
      resend.emails.send({
        from: "FPC Connect <noreply@connect.fpccorinth.org>",
        to: ["prayer@fpccorinth.org"],
        subject: `Prayer Request: ${submitterName}`,
        text: `Prayer request from ${submitterName}:\n\n${data.prayer}`,
      })
    );
  }

  try {
    await Promise.all(emails);
    return { statusCode: 200, body: "Emails sent" };
  } catch (error) {
    console.error("Email send error:", error);
    return { statusCode: 500, body: "Email send failed" };
  }
}

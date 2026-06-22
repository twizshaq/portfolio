import { NextResponse } from "next/server";

const recipientEmail = process.env.CONTACT_TO_EMAIL ?? "shaquxn@gmail.com";
const resendApiKey = process.env.RESEND_API_KEY;
const senderEmail =
  process.env.CONTACT_FROM_EMAIL ?? "Portfolio <onboarding@resend.dev>";
const maxAttachmentBytes = 5 * 1024 * 1024;
const maxImageCount = 3;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const runtime = "nodejs";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function fileToBase64(file: File) {
  const bytes = await file.arrayBuffer();
  return Buffer.from(bytes).toString("base64");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const fromEmail = getStringValue(formData, "email");
  const subject = getStringValue(formData, "subject");
  const message = getStringValue(formData, "message");
  const images = formData
    .getAll("image")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!subject || !message) {
    return NextResponse.json(
      { error: "Subject and message are required." },
      { status: 400 },
    );
  }

  if (fromEmail && !emailPattern.test(fromEmail)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  if (!resendApiKey) {
    return NextResponse.json(
      { code: "EMAIL_NOT_CONFIGURED", error: "Email sending is not configured." },
      { status: 503 },
    );
  }

  const attachments = [];

  if (images.length > maxImageCount) {
    return NextResponse.json(
      { error: `You can attach up to ${maxImageCount} images.` },
      { status: 400 },
    );
  }

  for (const image of images) {
    if (image.size > maxAttachmentBytes) {
      return NextResponse.json(
        { error: "Each image must be 5MB or smaller." },
        { status: 400 },
      );
    }

    attachments.push({
      content: await fileToBase64(image),
      filename: image.name,
    });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: senderEmail,
      to: recipientEmail,
      reply_to: fromEmail || undefined,
      subject,
      text: [
        fromEmail ? `From: ${fromEmail}` : null,
        "Message:",
        message,
      ]
        .filter(Boolean)
        .join("\n\n"),
      attachments,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    return NextResponse.json(
      { error: "Email failed to send.", details: errorText },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

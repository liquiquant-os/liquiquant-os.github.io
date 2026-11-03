// Netlify Serverless Function: POST /api/verify-payment
import crypto from "node:crypto";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return new Response(JSON.stringify({ error: "Razorpay secret not configured" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body = {};
  try {
    body = await req.json();
  } catch (_) {}

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return new Response(
      JSON.stringify({
        verified: false,
        error: "Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const sigBuf = Buffer.from(String(razorpay_signature), "utf8");
  const expBuf = Buffer.from(expectedSignature, "utf8");

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return new Response(
      JSON.stringify({
        verified: false,
        error: "Signature mismatch — payment not verified",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      verified: true,
      status: "paid",
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

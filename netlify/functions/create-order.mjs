// Netlify Serverless Function: POST /api/create-order
export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return new Response(JSON.stringify({ error: "Razorpay credentials not configured" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body = {};
  try {
    body = await req.json();
  } catch (_) {}

  const amount = Number(body.amount ?? 499900);
  const currency = body.currency || "INR";
  const receipt = body.receipt || `lq_rcpt_${Date.now()}`;

  if (!Number.isInteger(amount) || amount < 100) {
    return new Response(JSON.stringify({ error: "Minimum order amount is 100 paise" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, currency, receipt }),
    });

    const data = await response.json();
    if (response.status === 401) {
      return new Response(JSON.stringify({ error: "Razorpay authentication failed" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data?.error?.description || "Razorpay API error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        order_id: data.id,
        amount: data.amount,
        currency: data.currency,
        key_id: keyId,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to create order" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

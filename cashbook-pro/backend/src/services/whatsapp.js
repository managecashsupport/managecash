// WhatsApp Business Cloud API (Meta) — free 1,000 conversations/month
// Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in .env to enable
// If not configured, notifications are silently skipped

const BASE_URL = 'https://graph.facebook.com/v19.0';

async function sendWhatsApp(mobile, message) {
  const token   = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) return; // silently skip if not configured

  // Normalize mobile: strip non-digits, add country code if missing
  let phone = mobile.replace(/\D/g, '');
  if (phone.length === 10) phone = '91' + phone; // default India

  try {
    const res = await fetch(`${BASE_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error('WhatsApp send error:', err);
    }
  } catch (err) {
    console.error('WhatsApp request failed:', err.message);
  }
}

export async function notifyCredit({ mobile, amount, balanceAfter, shopName }) {
  const msg =
    `✅ *${shopName}*\n` +
    `₹${amount.toLocaleString('en-IN')} added to your wallet.\n` +
    `💰 New Balance: ₹${balanceAfter.toLocaleString('en-IN')}`;
  await sendWhatsApp(mobile, msg);
}

export async function notifySalary({ mobile, amount, remaining, monthName, year, shopName }) {
  const msg =
    `💼 *${shopName}*\n` +
    `₹${amount.toLocaleString('en-IN')} salary credited for ${monthName} ${year}.\n` +
    (remaining > 0
      ? `⏳ Remaining: ₹${remaining.toLocaleString('en-IN')}`
      : `✅ Salary fully paid.`);
  await sendWhatsApp(mobile, msg);
}

export async function notifyDebit({ mobile, amount, balanceAfter, shopName }) {
  const isLoan = balanceAfter < 0;
  const msg =
    `🛒 *${shopName}*\n` +
    `₹${amount.toLocaleString('en-IN')} deducted from your wallet.\n` +
    (isLoan
      ? `⚠️ Loan Balance: ₹${Math.abs(balanceAfter).toLocaleString('en-IN')} due`
      : `💰 New Balance: ₹${balanceAfter.toLocaleString('en-IN')}`);
  await sendWhatsApp(mobile, msg);
}

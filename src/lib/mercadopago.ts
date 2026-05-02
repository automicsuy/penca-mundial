import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;

export function getMPClient() {
  return new MercadoPagoConfig({
    accessToken: MP_ACCESS_TOKEN,
    options: { timeout: 5000 },
  });
}

export async function createPreference({
  groupSlug,
  groupName,
  userId,
  userEmail,
  amount,
}: {
  groupSlug: string;
  groupName: string;
  userId: string;
  userEmail: string;
  amount: number;
}) {
  const client = getMPClient();
  const preference = new Preference(client);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://penca-mundial.vercel.app";

  const result = await preference.create({
    body: {
      items: [
        {
          id: `penca-${groupSlug}`,
          title: `Inscripción Penca Mundial 2026 - ${groupName}`,
          quantity: 1,
          unit_price: amount,
          currency_id: "UYU",
        },
      ],
      payer: { email: userEmail, external_reference: userId },
      external_reference: `${groupSlug}|${userId}`,
      back_urls: {
        success: `${baseUrl}/grupos/${groupSlug}?payment=success`,
        failure: `${baseUrl}/grupos/${groupSlug}?payment=failure`,
        pending: `${baseUrl}/grupos/${groupSlug}?payment=pending`,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/api/payments/webhook`,
      statement_descriptor: "PENCA MUNDIAL",
    },
  });

  return result;
}

export async function getPayment(paymentId: string) {
  const client = getMPClient();
  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}

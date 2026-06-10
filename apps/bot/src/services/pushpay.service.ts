import axios from 'axios';

const BASE_URL = 'https://api.pushinpay.com.br/api';

export interface PixCreated {
  transactionId: string;
  qrCode: string;
  copyPaste: string;
  amount: number;
  expiresAt: string;
}

export async function createPix(apiKey: string, amountBRL: number, description: string): Promise<PixCreated> {
  const valueInCents = Math.round(amountBRL * 100);

  const { data } = await axios.post(
    `${BASE_URL}/pix/cashIn`,
    { value: valueInCents, split_rules: [] },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );

  return {
    transactionId: data.id,
    qrCode: data.qr_code,
    copyPaste: data.qr_code,
    amount: data.value,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  };
}

export async function getPixStatus(apiKey: string, transactionId: string) {
  const { data } = await axios.get(`${BASE_URL}/pix/cashIn/${transactionId}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  return data;
}

import QRCode from 'qrcode';

export async function generateQRCodePNG(qrToken: string): Promise<Buffer> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const url = `${baseUrl}/api/sessions/detect?qr=${qrToken}`;
  return QRCode.toBuffer(url, {
    type: 'png',
    width: 300,
    margin: 2,
    color: { dark: '#0D0D0D', light: '#FFFFFF' },
  });
}

export async function generateQRCodeDataURL(qrToken: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const url = `${baseUrl}/api/sessions/detect?qr=${qrToken}`;
  return QRCode.toDataURL(url, { width: 300, margin: 2 });
}

import qrcode from '../../vendor/qrcode-generator-2.0.4.mjs';

// Restituisce l'SVG del QR code (ridimensionabile via CSS)
export function qrSvg(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 8, margin: 16, scalable: true, alt: 'QR code per entrare nel castello' });
}

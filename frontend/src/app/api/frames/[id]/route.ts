import { NextRequest, NextResponse } from 'next/server';
import { SuiJsonRpcClient as SuiClient, getJsonRpcFullnodeUrl as getFullnodeUrl } from '@mysten/sui/jsonRpc';
import { parseInvoiceObject } from '../../../../lib/parse';

const client = new SuiClient({ url: getFullnodeUrl('devnet'), network: 'devnet' });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: invoiceId } = await params;
  const host = request.headers.get('host') || 'murk.vercel.app';
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${protocol}://${host}`;

  try {
    const obj = await client.getObject({
      id: invoiceId,
      options: { showContent: true }
    });

    const invoice = parseInvoiceObject(obj);
    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    const imageUrl = `${baseUrl}/api/receipt/svg/${invoiceId}`;
    const payUrl = `${baseUrl}/pay/${invoiceId}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="Confidential Invoice Ref: ${invoice.referenceId}" />
          <meta property="og:description" content="Pay safely and confidentially on Sui." />
          <meta property="og:image" content="${imageUrl}" />
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${imageUrl}" />
          <meta property="fc:frame:button:1" content="Pay on Murk" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${payUrl}" />
        </head>
        <body style="background: #020617; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-center; height: 100vh; margin: 0;">
          <div style="text-align: center; padding: 20px; border: 1px solid #1e293b; border-radius: 16px; background: #0b1329;">
            <h2>Invoice Ref: ${invoice.referenceId}</h2>
            <p>Status: Pending</p>
            <a href="${payUrl}" style="display: inline-block; padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Pay Invoice</a>
          </div>
        </body>
      </html>
    `.trim();

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=86400'
      }
    });

  } catch (err) {
    console.error('Frame rendering failed:', err);
    return new NextResponse('Failed to load frame', { status: 500 });
  }
}

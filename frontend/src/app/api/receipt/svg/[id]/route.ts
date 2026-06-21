import { NextRequest, NextResponse } from 'next/server';
import { SuiJsonRpcClient as SuiClient, getJsonRpcFullnodeUrl as getFullnodeUrl } from '@mysten/sui/jsonRpc';
import { generateReceiptSVG } from '../../../../../lib/generative';
import { parseInvoiceObject } from '../../../../../lib/parse';

// Initialize Sui client (devnet is the default target for the hackathon, but can be configured)
const rpcUrl = getFullnodeUrl('devnet');
const client = new SuiClient({ url: rpcUrl, network: 'devnet' });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: receiptId } = await params;

  try {
    // 1. Fetch Settlement Receipt
    const receiptObj = await client.getObject({
      id: receiptId,
      options: { showContent: true }
    });

    if (!receiptObj.data || !receiptObj.data.content) {
      return new NextResponse('Receipt not found', { status: 404 });
    }

    const receiptContent = receiptObj.data.content as any;
    if (!receiptContent.fields) {
      return new NextResponse('Invalid receipt object format', { status: 400 });
    }

    const { invoice_id, payee, payer, settled_at_ms } = receiptContent.fields;

    // 2. Fetch corresponding Invoice using invoice_id
    const invoiceObj = await client.getObject({
      id: invoice_id,
      options: { showContent: true }
    });

    const parsedInvoice = parseInvoiceObject(invoiceObj);
    const createdMs = parsedInvoice ? parsedInvoice.createdMs : Number(settled_at_ms) - 60000; // fallback: 1 min before
    const deadlineMs = parsedInvoice ? parsedInvoice.deadlineMs : Number(settled_at_ms) + 3600000; // fallback: 1 hour after

    // 3. Generate SVG
    // Note: generateReceiptSVG returns a data-URI (base64). We need to extract the raw SVG string
    // or rewrite a simple helper that returns the raw SVG markup for the image response.
    // Let's decode the base64 SVG returned by generateReceiptSVG to get raw SVG markup.
    const dataUri = generateReceiptSVG({
      invoiceId: invoice_id,
      payer,
      payee,
      createdMs,
      deadlineMs,
      settledMs: Number(settled_at_ms)
    });

    const base64Data = dataUri.split(',')[1];
    const svgMarkup = Buffer.from(base64Data, 'base64').toString('utf-8');

    // 4. Return as SVG Image
    return new NextResponse(svgMarkup, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });

  } catch (err: any) {
    console.error('Error generating receipt SVG:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

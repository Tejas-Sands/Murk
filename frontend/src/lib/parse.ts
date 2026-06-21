import { bytesToHex } from './confidential';

export interface ParsedInvoice {
  id: string;
  status: number; // 0=PENDING, 1=SETTLED, 2=CANCELLED, 3=EXPIRED
  payee: string;
  payer: string;
  encryptedAmount: string; // hex
  amountCommitment: string; // hex
  auditorPubkey: string | null; // hex
  auditorCiphertext: string | null; // hex
  description: string;
  referenceId: string;
  amountUsdcDisplayHint: number | null;
  deadlineMs: number;
  createdMs: number;
  settledMs: number | null;
  invoiceIdBinding: string;
}

export interface ParsedAuditorRegistry {
  id: string;
  admin: string;
  auditorsTableId: string;
}

export interface ParsedDecryptKey {
  id: string;
  invoiceId: string;
  auditorAddress: string;
}

export interface ParsedReceipt {
  id: string;
  invoiceId: string;
  payee: string;
  payer: string;
  settledAtMs: number;
  description: string;
}

// Extract value from Option<T> wrapper
function parseOption<T>(opt: any): T | null {
  if (opt === undefined || opt === null) return null;
  
  // Option structure could be { fields: { vec: [value] } }
  if (opt.fields && Array.isArray(opt.fields.vec)) {
    return opt.fields.vec.length > 0 ? opt.fields.vec[0] : null;
  }
  // Or { vec: [value] }
  if (Array.isArray(opt.vec)) {
    return opt.vec.length > 0 ? opt.vec[0] : null;
  }
  // Or directly an array [value]
  if (Array.isArray(opt)) {
    return opt.length > 0 ? opt[0] : null;
  }

  return opt;
}

// Safely convert vector<u8> (either array of numbers or hex string) to hex string
function parseVectorU8(val: any): string {
  if (typeof val === 'string') {
    return val.startsWith('0x') ? val.slice(2) : val;
  }
  if (Array.isArray(val)) {
    return bytesToHex(new Uint8Array(val));
  }
  return '';
}

// Convert String or ascii::String fields to typescript strings
function parseString(val: any): string {
  if (typeof val === 'string') return val;
  if (val && val.fields && typeof val.fields.bytes === 'string') {
    return val.fields.bytes;
  }
  if (val && val.fields && Array.isArray(val.fields.bytes)) {
    return new TextDecoder().decode(new Uint8Array(val.fields.bytes));
  }
  return '';
}

// Parse Sui Object into ParsedInvoice
export function parseInvoiceObject(objectData: any): ParsedInvoice | null {
  const content = objectData.data?.content;
  if (!content || content.dataType !== 'moveObject') {
    return null;
  }

  const fields = content.fields;
  const id = objectData.data.objectId;

  return {
    id,
    status: Number(fields.status),
    payee: fields.payee,
    payer: fields.payer,
    encryptedAmount: parseVectorU8(fields.encrypted_amount),
    amountCommitment: parseVectorU8(fields.amount_commitment),
    auditorPubkey: parseOption<any>(fields.auditor_pubkey) ? parseVectorU8(parseOption(fields.auditor_pubkey)) : null,
    auditorCiphertext: parseOption<any>(fields.auditor_ciphertext) ? parseVectorU8(parseOption(fields.auditor_ciphertext)) : null,
    description: parseString(fields.description),
    referenceId: parseString(fields.reference_id),
    amountUsdcDisplayHint: parseOption<number>(fields.amount_usdc_display_hint) 
      ? Number(parseOption<number>(fields.amount_usdc_display_hint)) 
      : null,
    deadlineMs: Number(fields.deadline_ms),
    createdMs: Number(fields.created_ms),
    settledMs: parseOption<number>(fields.settled_ms) ? Number(parseOption<number>(fields.settled_ms)) : null,
    invoiceIdBinding: typeof fields.invoice_id_binding === 'string' 
      ? fields.invoice_id_binding 
      : fields.invoice_id_binding?.fields?.id || '',
  };
}

// Parse AuditorRegistry shared object
export function parseRegistryObject(objectData: any): ParsedAuditorRegistry | null {
  const content = objectData.data?.content;
  if (!content || content.dataType !== 'moveObject') {
    return null;
  }

  const fields = content.fields;
  return {
    id: objectData.data.objectId,
    admin: fields.admin,
    auditorsTableId: fields.auditors?.fields?.id?.id || '',
  };
}

// Parse AuditorDecryptKey owned object
export function parseDecryptKeyObject(objectData: any): ParsedDecryptKey | null {
  const content = objectData.data?.content;
  if (!content || content.dataType !== 'moveObject') {
    return null;
  }

  const fields = content.fields;
  return {
    id: objectData.data.objectId,
    invoiceId: fields.invoice_id,
    auditorAddress: fields.auditor_address,
  };
}

// Parse SettlementReceipt owned object
export function parseReceiptObject(objectData: any): ParsedReceipt | null {
  const content = objectData.data?.content;
  if (!content || content.dataType !== 'moveObject') {
    return null;
  }

  const fields = content.fields;
  return {
    id: objectData.data.objectId,
    invoiceId: fields.invoice_id,
    payee: fields.payee,
    payer: fields.payer,
    settledAtMs: Number(fields.settled_at_ms),
    description: parseString(fields.description),
  };
}

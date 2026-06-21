import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, REGISTRY_ID, CLOCK_ID } from './constants';

export interface CreateInvoiceArgs {
  encryptedAmount: Uint8Array;
  amountCommitment: Uint8Array;
  auditorPubkey?: Uint8Array | null;
  auditorCiphertext?: Uint8Array | null;
  payer: string;
  description: string;
  referenceId: string;
  deadlineMs: number;
}

// Build PTB to create an Invoice
export function buildCreateInvoicePTB(args: CreateInvoiceArgs): Transaction {
  const tx = new Transaction();

  const hasAuditor = !!args.auditorPubkey && !!args.auditorCiphertext;
  const encAmountVec = Array.from(args.encryptedAmount);
  const commitmentVec = Array.from(args.amountCommitment);
  const pubkeyVec = args.auditorPubkey ? Array.from(args.auditorPubkey) : [];
  const ciphertextVec = args.auditorCiphertext ? Array.from(args.auditorCiphertext) : [];

  const descBytes = Array.from(new TextEncoder().encode(args.description));
  const refBytes = Array.from(new TextEncoder().encode(args.referenceId));

  tx.moveCall({
    target: `${PACKAGE_ID}::murk::create_invoice`,
    arguments: [
      tx.pure.vector('u8', encAmountVec),
      tx.pure.vector('u8', commitmentVec),
      tx.pure.vector('u8', pubkeyVec),
      tx.pure.vector('u8', ciphertextVec),
      tx.pure.bool(hasAuditor),
      tx.pure.address(args.payer),
      tx.pure.vector('u8', descBytes),
      tx.pure.vector('u8', refBytes),
      tx.pure.u64(args.deadlineMs),
      tx.object(CLOCK_ID),
    ],
  });

  return tx;
}

// Build PTB to settle an Invoice
export function buildSettleInvoicePTB(args: {
  invoiceId: string;
  amount: number;
  salt: Uint8Array;
}): Transaction {
  const tx = new Transaction();
  const saltVec = Array.from(args.salt);

  tx.moveCall({
    target: `${PACKAGE_ID}::murk::settle_invoice`,
    arguments: [
      tx.object(args.invoiceId),
      tx.pure.u64(args.amount),
      tx.pure.vector('u8', saltVec),
      tx.object(CLOCK_ID),
    ],
  });

  return tx;
}

// Build PTB to cancel an Invoice
export function buildCancelInvoicePTB(args: {
  invoiceId: string;
  capId: string;
}): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::murk::cancel_invoice`,
    arguments: [
      tx.object(args.invoiceId),
      tx.object(args.capId),
      tx.object(CLOCK_ID),
    ],
  });

  return tx;
}

// Build PTB to register an Auditor
export function buildRegisterAuditorPTB(args: {
  auditorAddress: string;
  pubkey: Uint8Array;
}): Transaction {
  const tx = new Transaction();
  const pubkeyVec = Array.from(args.pubkey);

  tx.moveCall({
    target: `${PACKAGE_ID}::auditor::register_auditor`,
    arguments: [
      tx.object(REGISTRY_ID),
      tx.pure.address(args.auditorAddress),
      tx.pure.vector('u8', pubkeyVec),
    ],
  });

  return tx;
}

// Build PTB to request decryption key for audit
export function buildRequestDecryptKeyPTB(args: {
  invoiceId: string;
}): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::murk::request_decrypt_key`,
    arguments: [
      tx.object(args.invoiceId),
      tx.object(REGISTRY_ID),
    ],
  });

  return tx;
}

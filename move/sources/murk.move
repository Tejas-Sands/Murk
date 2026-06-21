module murk::murk {
    use std::string;
    use sui::clock::Clock;
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use murk::invoice::{Self, Invoice, InvoiceAdminCap};
    use murk::settlement;
    use murk::auditor::{Self, AuditorRegistry};

    public entry fun create_invoice(
        encrypted_amount: vector<u8>,
        amount_commitment: vector<u8>,
        auditor_pubkey: vector<u8>,
        auditor_ciphertext: vector<u8>,
        has_auditor: bool,
        payer: address,
        description: vector<u8>,
        reference_id: vector<u8>,
        deadline_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let opt_pubkey = if (has_auditor) {
            option::some(auditor_pubkey)
        } else {
            option::none()
        };

        let opt_ciphertext = if (has_auditor) {
            option::some(auditor_ciphertext)
        } else {
            option::none()
        };

        let desc_str = string::utf8(description);
        let ref_str = string::utf8(reference_id);

        let (invoice, cap) = invoice::create(
            encrypted_amount,
            amount_commitment,
            opt_pubkey,
            opt_ciphertext,
            payer,
            desc_str,
            ref_str,
            deadline_ms,
            clock,
            ctx
        );

        invoice::share_invoice(invoice);
        transfer::public_transfer(cap, tx_context::sender(ctx));
    }

    public entry fun settle_invoice(
        invoice: &mut Invoice,
        amount: u64,
        salt: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let receipt = settlement::settle(invoice, amount, salt, clock, ctx);
        transfer::public_transfer(receipt, tx_context::sender(ctx));
    }

    public entry fun cancel_invoice(
        invoice: &mut Invoice,
        cap: InvoiceAdminCap,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        invoice::cancel(invoice, cap, clock, ctx);
    }

    public entry fun mark_invoice_expired(
        invoice: &mut Invoice,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        invoice::mark_expired(invoice, clock, ctx);
    }

    public entry fun request_decrypt_key(
        invoice: &Invoice,
        registry: &AuditorRegistry,
        ctx: &mut TxContext
    ) {
        let key = auditor::issue_decrypt_key(invoice, registry, ctx);
        transfer::public_transfer(key, tx_context::sender(ctx));
    }
}

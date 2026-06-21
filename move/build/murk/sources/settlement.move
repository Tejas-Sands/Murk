module murk::settlement {
    use sui::clock::{Self, Clock};
    use sui::tx_context::{Self, TxContext};
    use sui::bcs;
    use std::hash;
    use murk::invoice::{Self, Invoice, SettlementReceipt};
    use murk::errors;

    const SETTLED: u8 = 1;

    public fun settle(
        invoice: &mut Invoice,
        amount: u64,
        salt: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ): SettlementReceipt {
        assert!(tx_context::sender(ctx) == invoice::payer(invoice), errors::e_unauthorized());
        assert!(invoice::is_pending(invoice), errors::e_invoice_not_pending());
        assert!(clock::timestamp_ms(clock) <= invoice::deadline_ms(invoice), errors::e_invoice_expired());
        
        assert!(
            verify_commitment(amount, salt, *invoice::amount_commitment(invoice)),
            errors::e_amount_mismatch()
        );

        // State update FIRST (Check-Effect-Interact)
        invoice::set_status(invoice, SETTLED);
        invoice::set_settled_ms(invoice, clock::timestamp_ms(clock));

        // Create and return receipt LAST
        let receipt = invoice::mint_receipt(
            sui::object::id(invoice),
            invoice::payee(invoice),
            invoice::payer(invoice),
            clock::timestamp_ms(clock),
            *invoice::description(invoice),
            ctx
        );

        receipt
    }

    public fun verify_commitment(
        amount: u64,
        salt: vector<u8>,
        commitment: vector<u8>
    ): bool {
        let mut data = bcs::to_bytes(&amount);
        vector::append(&mut data, salt);
        let calculated_hash = hash::sha2_256(data);
        calculated_hash == commitment
    }
}

module murk::split {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use murk::invoice::{Self, Invoice};
    use murk::settlement;
    use murk::errors;

    public struct SplitInvoice has key {
        id: UID,
        parent_invoice_id: ID,
        payers: vector<address>,
        paid_payers: vector<address>,
        commitments: vector<vector<u8>>,
        status: u8
    }

    public entry fun create_split_invoice(
        parent_invoice: &Invoice,
        payers: vector<address>,
        commitments: vector<vector<u8>>,
        ctx: &mut TxContext
    ) {
        assert!(invoice::payee(parent_invoice) == tx_context::sender(ctx), errors::e_unauthorized());
        assert!(vector::length(&payers) == vector::length(&commitments), errors::e_invalid_address());

        let split = SplitInvoice {
            id: object::new(ctx),
            parent_invoice_id: object::id(parent_invoice),
            payers,
            paid_payers: vector[],
            commitments,
            status: 0
        };
        transfer::share_object(split);
    }

    public entry fun settle_split_part(
        split: &mut SplitInvoice,
        invoice: &mut Invoice,
        amount: u64,
        salt: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(split.status == 0, errors::e_invoice_not_pending());

        // Find sender index in payers
        let (found, index) = vector::index_of(&split.payers, &sender);
        assert!(found, errors::e_unauthorized());

        // Ensure not already paid
        assert!(!vector::contains(&split.paid_payers, &sender), errors::e_invalid_address());

        // Verify commitment for this specific split part
        let commitment = vector::borrow(&split.commitments, index);
        assert!(
            settlement::verify_commitment(amount, salt, *commitment),
            errors::e_amount_mismatch()
        );

        // Add to paid list
        vector::push_back(&mut split.paid_payers, sender);

        // Mint Settlement Receipt for this payer
        let receipt = invoice::mint_receipt(
            split.parent_invoice_id,
            invoice::payee(invoice),
            sender,
            clock::timestamp_ms(clock),
            *invoice::description(invoice),
            ctx
        );
        transfer::public_transfer(receipt, sender);

        // If all have paid, mark fully settled
        if (vector::length(&split.paid_payers) == vector::length(&split.payers)) {
            split.status = 1;
            invoice::set_status(invoice, 1); // SETTLED
            invoice::set_settled_ms(invoice, clock::timestamp_ms(clock));
        }
    }
}

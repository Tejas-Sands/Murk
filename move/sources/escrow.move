module murk::escrow {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use murk::invoice::{Self, Invoice};
    use murk::errors;

    public struct Escrow<phantom T> has key {
        id: UID,
        invoice_id: ID,
        payee: address,
        payer: address,
        balance: Balance<T>,
        released: bool,
        refunded: bool,
    }

    public entry fun lock_funds<T>(
        invoice: &mut Invoice,
        payment: Coin<T>,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == invoice::payer(invoice), errors::e_unauthorized());
        assert!(invoice::is_pending(invoice), errors::e_invoice_not_pending());
        assert!(coin::value(&payment) == amount, errors::e_amount_mismatch());

        let escrow = Escrow<T> {
            id: object::new(ctx),
            invoice_id: object::id(invoice),
            payee: invoice::payee(invoice),
            payer: sender,
            balance: coin::into_balance(payment),
            released: false,
            refunded: false,
        };

        // Share the escrow object so both parties can interact
        transfer::share_object(escrow);
    }

    public entry fun release_funds<T>(
        escrow: &mut Escrow<T>,
        invoice: &mut Invoice,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == escrow.payer, errors::e_unauthorized());
        assert!(!escrow.released && !escrow.refunded, errors::e_invoice_not_pending());

        // Update escrow state
        escrow.released = true;

        // Perform settlement state updates on the invoice
        invoice::set_status(invoice, 1); // SETTLED
        invoice::set_settled_ms(invoice, clock::timestamp_ms(clock));

        // Transfer funds to payee
        let funds = balance::withdraw_all(&mut escrow.balance);
        let coin = coin::from_balance(funds, ctx);
        transfer::public_transfer(coin, escrow.payee);

        // Mint Settlement Receipt and transfer to payer
        let receipt = invoice::mint_receipt(
            escrow.invoice_id,
            escrow.payee,
            escrow.payer,
            clock::timestamp_ms(clock),
            *invoice::description(invoice),
            ctx
        );
        transfer::public_transfer(receipt, escrow.payer);
    }

    public entry fun refund_funds<T>(
        escrow: &mut Escrow<T>,
        invoice: &mut Invoice,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        // Only payee can approve a refund to the payer, or payer can claim if invoice is cancelled/expired
        assert!(sender == escrow.payee, errors::e_unauthorized());
        assert!(!escrow.released && !escrow.refunded, errors::e_invoice_not_pending());

        escrow.refunded = true;

        // Reset invoice status to pending or cancelled
        invoice::set_status(invoice, 2); // CANCELLED

        // Refund to payer
        let funds = balance::withdraw_all(&mut escrow.balance);
        let coin = coin::from_balance(funds, ctx);
        transfer::public_transfer(coin, escrow.payer);
    }
}

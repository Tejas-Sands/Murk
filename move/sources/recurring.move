module murk::recurring {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use murk::errors;

    public struct Subscription<phantom T> has key {
        id: UID,
        payee: address,
        payer: address,
        balance: Balance<T>,
        amount_per_interval: u64,
        interval_ms: u64,
        last_drawn_ms: u64,
        active: bool
    }

    public entry fun create_subscription<T>(
        payee: address,
        funding: Coin<T>,
        amount_per_interval: u64,
        interval_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let subscription = Subscription<T> {
            id: object::new(ctx),
            payee,
            payer: sender,
            balance: coin::into_balance(funding),
            amount_per_interval,
            interval_ms,
            last_drawn_ms: clock::timestamp_ms(clock),
            active: true
        };
        transfer::share_object(subscription);
    }

    public entry fun draw_subscription<T>(
        subscription: &mut Subscription<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(subscription.active, errors::e_invoice_not_pending()); // reusing error
        assert!(tx_context::sender(ctx) == subscription.payee, errors::e_unauthorized());
        
        let now = clock::timestamp_ms(clock);
        assert!(now >= subscription.last_drawn_ms + subscription.interval_ms, errors::e_invoice_not_expired());

        // Withdraw the allowed amount
        let draw_amount = subscription.amount_per_interval;
        assert!(balance::value(&subscription.balance) >= draw_amount, errors::e_amount_mismatch());

        subscription.last_drawn_ms = now;

        let funds = balance::split(&mut subscription.balance, draw_amount);
        let coin = coin::from_balance(funds, ctx);
        transfer::public_transfer(coin, subscription.payee);
    }

    public entry fun cancel_subscription<T>(
        subscription: &mut Subscription<T>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == subscription.payer, errors::e_unauthorized());
        assert!(subscription.active, errors::e_invoice_not_pending());

        subscription.active = false;

        // Refund remaining balance to payer
        let remaining = balance::withdraw_all(&mut subscription.balance);
        let coin = coin::from_balance(remaining, ctx);
        transfer::public_transfer(coin, subscription.payer);
    }
}

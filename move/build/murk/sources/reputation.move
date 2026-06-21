module murk::reputation {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use murk::invoice::{Self, SettlementReceipt, Invoice};
    use murk::errors;

    public struct ReputationBadge has key {
        id: UID,
        owner: address,
        badge_tier: u8,
        issued_at_ms: u64,
        on_time_count: u64,
        processed_receipts: Table<ID, bool>
    }

    const TIER_BRONZE: u8 = 1;
    const TIER_SILVER: u8 = 2;
    const TIER_GOLD: u8 = 3;
    const TIER_PLATINUM: u8 = 4;

    public entry fun init_badge(clock: &Clock, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let badge = ReputationBadge {
            id: object::new(ctx),
            owner: sender,
            badge_tier: TIER_BRONZE,
            issued_at_ms: clock::timestamp_ms(clock),
            on_time_count: 0,
            processed_receipts: table::new(ctx)
        };
        transfer::transfer(badge, sender);
    }

    public entry fun process_receipt(
        badge: &mut ReputationBadge,
        receipt: &SettlementReceipt,
        invoice: &Invoice,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Ensure sender owns the badge implicitly (they passed it as &mut)
        assert!(badge.owner == sender, errors::e_unauthorized());
        
        // Ensure receipt matches invoice
        assert!(invoice::receipt_invoice_id(receipt) == object::id(invoice), errors::e_cap_mismatch());
        
        // Ensure receipt belongs to sender (the payer who settled it)
        assert!(invoice::receipt_payer(receipt) == sender, errors::e_unauthorized());
        
        let receipt_id = object::id(receipt);
        
        // Ensure not already processed
        assert!(!table::contains(&badge.processed_receipts, receipt_id), errors::e_invalid_address());
        
        // Mark as processed
        table::add(&mut badge.processed_receipts, receipt_id, true);

        // Check if settled on time
        let settled_at = invoice::receipt_settled_at_ms(receipt);
        let deadline = invoice::deadline_ms(invoice);
        
        if (settled_at <= deadline) {
            badge.on_time_count = badge.on_time_count + 1;
        };

        // Update tier
        let count = badge.on_time_count;
        badge.badge_tier = if (count >= 50) {
            TIER_PLATINUM
        } else if (count >= 20) {
            TIER_GOLD
        } else if (count >= 10) {
            TIER_SILVER
        } else {
            TIER_BRONZE
        };
    }
}

module murk::invoice {
    use std::string::String;
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::transfer;
    use sui::package;
    use sui::display;
    use murk::errors;

    // Status Constants
    const PENDING: u8 = 0;
    const SETTLED: u8 = 1;
    const CANCELLED: u8 = 2;
    const EXPIRED: u8 = 3;

    // OTW for Publisher
    public struct INVOICE has drop {}

    public struct Invoice has key {
        id: UID,
        status: u8,
        payee: address,
        payer: address,
        encrypted_amount: vector<u8>,
        amount_commitment: vector<u8>,
        auditor_pubkey: Option<vector<u8>>,
        auditor_ciphertext: Option<vector<u8>>,
        description: String,
        reference_id: String,
        amount_usdc_display_hint: Option<u64>,
        deadline_ms: u64,
        created_ms: u64,
        settled_ms: Option<u64>,
        invoice_id_binding: ID
    }

    public struct InvoiceAdminCap has key, store {
        id: UID,
        invoice_id: ID
    }

    public struct SettlementReceipt has key, store {
        id: UID,
        invoice_id: ID,
        payee: address,
        payer: address,
        settled_at_ms: u64,
        description: String
    }
    fun init(otw: INVOICE, ctx: &mut TxContext) {
        // Claim Publisher for the package
        let publisher = package::claim(otw, ctx);

        // Setup Display for SettlementReceipt
        let keys = vector[
            std::string::utf8(b"name"),
            std::string::utf8(b"link"),
            std::string::utf8(b"image_url"),
            std::string::utf8(b"description"),
            std::string::utf8(b"project_url"),
            std::string::utf8(b"creator"),
        ];

        let values = vector[
            std::string::utf8(b"Murk Settlement Receipt"),
            std::string::utf8(b"https://murk.xyz/receipt/{id}"),
            // The frontend will dynamically generate an SVG image URL or base64 data URL
            // We use a template URL here that can be interpreted by indexers or the frontend API
            std::string::utf8(b"https://murk.xyz/api/receipt/svg/{id}"),
            std::string::utf8(b"Confidential Payment Settlement between {payer} and {payee}"),
            std::string::utf8(b"https://murk.xyz/"),
            std::string::utf8(b"Murk Protocol"),
        ];

        let mut display = display::new_with_fields<SettlementReceipt>(
            &publisher, keys, values, ctx
        );
        display::update_version(&mut display);

        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(display, tx_context::sender(ctx));
    }

    // Key functions
    public fun create(
        encrypted_amount: vector<u8>,
        amount_commitment: vector<u8>,
        auditor_pubkey: Option<vector<u8>>,
        auditor_ciphertext: Option<vector<u8>>,
        payer: address,
        description: String,
        reference_id: String,
        deadline_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ): (Invoice, InvoiceAdminCap) {
        assert!(payer != @0x0, errors::e_invalid_address());
        assert!(!vector::is_empty(&encrypted_amount), errors::e_zero_amount());
        assert!(!vector::is_empty(&amount_commitment), errors::e_zero_amount());
        assert!(deadline_ms > clock::timestamp_ms(clock), errors::e_deadline_in_past());
        
        if (option::is_some(&auditor_pubkey)) {
            assert!(option::is_some(&auditor_ciphertext), errors::e_zero_amount());
        } else {
            assert!(option::is_none(&auditor_ciphertext), errors::e_zero_amount());
        };

        let id = object::new(ctx);
        let invoice_id = object::uid_to_inner(&id);
        let payee = tx_context::sender(ctx);

        let invoice = Invoice {
            id,
            status: PENDING,
            payee,
            payer,
            encrypted_amount,
            amount_commitment,
            auditor_pubkey,
            auditor_ciphertext,
            description,
            reference_id,
            amount_usdc_display_hint: option::none(),
            deadline_ms,
            created_ms: clock::timestamp_ms(clock),
            settled_ms: option::none(),
            invoice_id_binding: invoice_id
        };

        let cap_id = object::new(ctx);
        let cap = InvoiceAdminCap {
            id: cap_id,
            invoice_id
        };

        (invoice, cap)
    }

    public fun share_invoice(invoice: Invoice) {
        transfer::share_object(invoice);
    }

    public fun cancel(
        invoice: &mut Invoice,
        cap: InvoiceAdminCap,
        _clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(cap.invoice_id == object::id(invoice), errors::e_cap_mismatch());
        assert!(invoice.status == PENDING, errors::e_invoice_not_pending());
        assert!(tx_context::sender(ctx) == invoice.payee, errors::e_unauthorized());

        invoice.status = CANCELLED;

        let InvoiceAdminCap { id, invoice_id: _ } = cap;
        object::delete(id);
    }

    public fun mark_expired(
        invoice: &mut Invoice,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        assert!(invoice.status == PENDING, errors::e_invoice_not_pending());
        assert!(clock::timestamp_ms(clock) > invoice.deadline_ms, errors::e_invoice_not_expired());

        invoice.status = EXPIRED;
    }

    // Setters called within package
    public(package) fun set_status(invoice: &mut Invoice, status: u8) {
        invoice.status = status;
    }

    public(package) fun set_settled_ms(invoice: &mut Invoice, ms: u64) {
        invoice.settled_ms = option::some(ms);
    }

    public(package) fun mint_receipt(
        invoice_id: ID,
        payee: address,
        payer: address,
        settled_at_ms: u64,
        description: String,
        ctx: &mut TxContext
    ): SettlementReceipt {
        SettlementReceipt {
            id: object::new(ctx),
            invoice_id,
            payee,
            payer,
            settled_at_ms,
            description
        }
    }

    // Getters
    public fun status(invoice: &Invoice): u8 { invoice.status }
    public fun payee(invoice: &Invoice): address { invoice.payee }
    public fun payer(invoice: &Invoice): address { invoice.payer }
    public fun encrypted_amount(invoice: &Invoice): &vector<u8> { &invoice.encrypted_amount }
    public fun amount_commitment(invoice: &Invoice): &vector<u8> { &invoice.amount_commitment }
    public fun auditor_pubkey(invoice: &Invoice): &Option<vector<u8>> { &invoice.auditor_pubkey }
    public fun auditor_ciphertext(invoice: &Invoice): &Option<vector<u8>> { &invoice.auditor_ciphertext }
    public fun deadline_ms(invoice: &Invoice): u64 { invoice.deadline_ms }
    public fun description(invoice: &Invoice): &String { &invoice.description }
    public fun reference_id(invoice: &Invoice): &String { &invoice.reference_id }
    public fun is_auditable(invoice: &Invoice): bool { option::is_some(&invoice.auditor_pubkey) }
    
    // Status checks
    public fun is_pending(invoice: &Invoice): bool { invoice.status == PENDING }
    public fun is_settled(invoice: &Invoice): bool { invoice.status == SETTLED }
    public fun is_cancelled(invoice: &Invoice): bool { invoice.status == CANCELLED }
    public fun is_expired(invoice: &Invoice): bool { invoice.status == EXPIRED }
    
    // Receipt Getters
    public fun receipt_invoice_id(receipt: &SettlementReceipt): ID { receipt.invoice_id }
    public fun receipt_payee(receipt: &SettlementReceipt): address { receipt.payee }
    public fun receipt_payer(receipt: &SettlementReceipt): address { receipt.payer }
    public fun receipt_settled_at_ms(receipt: &SettlementReceipt): u64 { receipt.settled_at_ms }
    public fun receipt_description(receipt: &SettlementReceipt): &String { &receipt.description }
}

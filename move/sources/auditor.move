module murk::auditor {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};
    use sui::transfer;
    use murk::invoice::{Self, Invoice};
    use murk::errors;

    public struct AuditorRegistry has key {
        id: UID,
        auditors: Table<address, vector<u8>>,
        admin: address
    }

    public struct AuditorDecryptKey has key, store {
        id: UID,
        invoice_id: ID,
        auditor_address: address
    }

    public fun new_registry(ctx: &mut TxContext): AuditorRegistry {
        AuditorRegistry {
            id: object::new(ctx),
            auditors: table::new(ctx),
            admin: tx_context::sender(ctx)
        }
    }

    public entry fun create_registry(ctx: &mut TxContext) {
        let registry = new_registry(ctx);
        transfer::share_object(registry);
    }

    public entry fun register_auditor(
        registry: &mut AuditorRegistry,
        auditor: address,
        pubkey: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == registry.admin, errors::e_unauthorized());
        assert!(auditor != @0x0, errors::e_invalid_address());
        assert!(!vector::is_empty(&pubkey), errors::e_zero_amount());
        
        if (table::contains(&registry.auditors, auditor)) {
            let existing_pubkey = table::borrow_mut(&mut registry.auditors, auditor);
            *existing_pubkey = pubkey;
        } else {
            table::add(&mut registry.auditors, auditor, pubkey);
        };
    }

    public entry fun remove_auditor(
        registry: &mut AuditorRegistry,
        auditor: address,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == registry.admin, errors::e_unauthorized());
        assert!(table::contains(&registry.auditors, auditor), errors::e_not_auditor());
        table::remove(&mut registry.auditors, auditor);
    }

    public fun issue_decrypt_key(
        invoice: &Invoice,
        registry: &AuditorRegistry,
        ctx: &mut TxContext
    ): AuditorDecryptKey {
        assert!(invoice::is_auditable(invoice), errors::e_no_auditor_key());
        
        let sender = tx_context::sender(ctx);
        assert!(table::contains(&registry.auditors, sender), errors::e_not_auditor());
        
        let registered_pubkey = table::borrow(&registry.auditors, sender);
        let invoice_pubkey = invoice::auditor_pubkey(invoice);
        
        assert!(
            option::is_some(invoice_pubkey) && option::borrow(invoice_pubkey) == registered_pubkey,
            errors::e_not_auditor()
        );

        AuditorDecryptKey {
            id: object::new(ctx),
            invoice_id: sui::object::id(invoice),
            auditor_address: sender
        }
    }

    public fun confirm_audit(
        invoice: &Invoice,
        key: &AuditorDecryptKey
    ): vector<u8> {
        assert!(key.invoice_id == sui::object::id(invoice), errors::e_cap_mismatch());
        let opt_ciphertext = invoice::auditor_ciphertext(invoice);
        *option::borrow(opt_ciphertext)
    }

    // Getters for tests/scripts
    public fun is_registered(registry: &AuditorRegistry, auditor: address): bool {
        table::contains(&registry.auditors, auditor)
    }

    public fun get_pubkey(registry: &AuditorRegistry, auditor: address): &vector<u8> {
        table::borrow(&registry.auditors, auditor)
    }

    public fun key_invoice_id(key: &AuditorDecryptKey): ID { key.invoice_id }
    public fun key_auditor_address(key: &AuditorDecryptKey): address { key.auditor_address }
}

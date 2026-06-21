#[test_only]
module murk::murk_tests {
    use sui::test_scenario::{Self, Scenario};
    use sui::clock::{Self, Clock};
    use std::string;
    use murk::invoice::{Self, Invoice, InvoiceAdminCap, SettlementReceipt};
    use murk::settlement;
    use murk::auditor::{Self, AuditorRegistry, AuditorDecryptKey};
    use std::unit_test;
    use std::hash;

    const ALICE: address = @0xA;
    const BOB: address = @0xB;
    const AUDITOR: address = @0xC;

    fun get_commitment(amount: u64, salt: vector<u8>): vector<u8> {
        let mut data = sui::bcs::to_bytes(&amount);
        vector::append(&mut data, salt);
        hash::sha2_256(data)
    }

    #[test]
    fun test_create_invoice_valid() {
        let mut scenario = test_scenario::begin(ALICE);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        
        let salt = b"salt123";
        let commitment = get_commitment(100, salt);
        
        let (invoice, cap) = invoice::create(
            b"encrypted_amount_bytes",
            commitment,
            option::none(),
            option::none(),
            BOB,
            string::utf8(b"Test Invoice"),
            string::utf8(b"REF-1"),
            1000,
            &clock,
            test_scenario::ctx(&mut scenario)
        );

        assert!(invoice::status(&invoice) == 0, 0); // PENDING
        assert!(invoice::payee(&invoice) == ALICE, 1);
        assert!(invoice::payer(&invoice) == BOB, 2);
        assert!(invoice::deadline_ms(&invoice) == 1000, 3);
        assert!(!invoice::is_auditable(&invoice), 4);

        unit_test::destroy(cap);
        unit_test::destroy(invoice);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 15)] // errors::e_deadline_in_past
    fun test_create_invoice_expired_deadline_aborts() {
        let mut scenario = test_scenario::begin(ALICE);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::increment_for_testing(&mut clock, 1000);

        let commitment = get_commitment(100, b"salt");
        
        let (invoice, cap) = invoice::create(
            b"enc",
            commitment,
            option::none(),
            option::none(),
            BOB,
            string::utf8(b"Test"),
            string::utf8(b"R"),
            500, // in the past relative to clock (1000)
            &clock,
            test_scenario::ctx(&mut scenario)
        );

        unit_test::destroy(cap);
        unit_test::destroy(invoice);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 22)] // errors::e_zero_amount
    fun test_create_invoice_zero_amount_aborts() {
        let mut scenario = test_scenario::begin(ALICE);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let (invoice, cap) = invoice::create(
            b"", // empty encrypted amount
            get_commitment(100, b"salt"),
            option::none(),
            option::none(),
            BOB,
            string::utf8(b"Test"),
            string::utf8(b"R"),
            1000,
            &clock,
            test_scenario::ctx(&mut scenario)
        );

        unit_test::destroy(cap);
        unit_test::destroy(invoice);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 2)] // errors::e_invalid_address
    fun test_create_invoice_invalid_payer_aborts() {
        let mut scenario = test_scenario::begin(ALICE);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let (invoice, cap) = invoice::create(
            b"enc",
            get_commitment(100, b"salt"),
            option::none(),
            option::none(),
            @0x0, // invalid payer address
            string::utf8(b"Test"),
            string::utf8(b"R"),
            1000,
            &clock,
            test_scenario::ctx(&mut scenario)
        );

        unit_test::destroy(cap);
        unit_test::destroy(invoice);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_cancel_by_payee_succeeds() {
        let mut scenario = test_scenario::begin(ALICE);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let (mut invoice, cap) = invoice::create(
            b"enc",
            get_commitment(100, b"salt"),
            option::none(),
            option::none(),
            BOB,
            string::utf8(b"Test"),
            string::utf8(b"R"),
            1000,
            &clock,
            test_scenario::ctx(&mut scenario)
        );

        invoice::cancel(&mut invoice, cap, &clock, test_scenario::ctx(&mut scenario));
        assert!(invoice::is_cancelled(&invoice), 0);

        unit_test::destroy(invoice);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 0)] // errors::e_unauthorized
    fun test_cancel_by_unauthorized_aborts() {
        let mut scenario = test_scenario::begin(ALICE);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let (mut invoice, cap) = invoice::create(
            b"enc",
            get_commitment(100, b"salt"),
            option::none(),
            option::none(),
            BOB,
            string::utf8(b"Test"),
            string::utf8(b"R"),
            1000,
            &clock,
            test_scenario::ctx(&mut scenario)
        );

        test_scenario::next_tx(&mut scenario, BOB); // switch sender to BOB
        
        invoice::cancel(&mut invoice, cap, &clock, test_scenario::ctx(&mut scenario));

        unit_test::destroy(invoice);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_mark_expired_after_deadline() {
        let mut scenario = test_scenario::begin(ALICE);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let (mut invoice, cap) = invoice::create(
            b"enc",
            get_commitment(100, b"salt"),
            option::none(),
            option::none(),
            BOB,
            string::utf8(b"Test"),
            string::utf8(b"R"),
            1000,
            &clock,
            test_scenario::ctx(&mut scenario)
        );

        clock::increment_for_testing(&mut clock, 1005); // past 1000 deadline

        invoice::mark_expired(&mut invoice, &clock, test_scenario::ctx(&mut scenario));
        assert!(invoice::is_expired(&invoice), 0);

        unit_test::destroy(cap);
        unit_test::destroy(invoice);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 12)] // errors::e_invoice_not_expired
    fun test_mark_expired_before_deadline_aborts() {
        let mut scenario = test_scenario::begin(ALICE);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let (mut invoice, cap) = invoice::create(
            b"enc",
            get_commitment(100, b"salt"),
            option::none(),
            option::none(),
            BOB,
            string::utf8(b"Test"),
            string::utf8(b"R"),
            1000,
            &clock,
            test_scenario::ctx(&mut scenario)
        );

        invoice::mark_expired(&mut invoice, &clock, test_scenario::ctx(&mut scenario));

        unit_test::destroy(cap);
        unit_test::destroy(invoice);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_settle_valid() {
        let mut scenario = test_scenario::begin(ALICE);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let salt = b"salt123";
        let commitment = get_commitment(1500, salt);
        
        let (mut invoice, cap) = invoice::create(
            b"enc",
            commitment,
            option::none(),
            option::none(),
            BOB,
            string::utf8(b"Test"),
            string::utf8(b"R"),
            1000,
            &clock,
            test_scenario::ctx(&mut scenario)
        );

        test_scenario::next_tx(&mut scenario, BOB); // switch to payer

        let receipt = settlement::settle(&mut invoice, 1500, salt, &clock, test_scenario::ctx(&mut scenario));
        
        assert!(invoice::is_settled(&invoice), 0);
        assert!(invoice::receipt_invoice_id(&receipt) == sui::object::id(&invoice), 1);
        assert!(invoice::receipt_payer(&receipt) == BOB, 2);
        assert!(invoice::receipt_payee(&receipt) == ALICE, 3);

        unit_test::destroy(cap);
        unit_test::destroy(invoice);
        unit_test::destroy(receipt);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 20)] // errors::e_amount_mismatch
    fun test_settle_amount_mismatch_aborts() {
        let mut scenario = test_scenario::begin(ALICE);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let salt = b"salt123";
        let commitment = get_commitment(1500, salt);
        
        let (mut invoice, cap) = invoice::create(
            b"enc",
            commitment,
            option::none(),
            option::none(),
            BOB,
            string::utf8(b"Test"),
            string::utf8(b"R"),
            1000,
            &clock,
            test_scenario::ctx(&mut scenario)
        );

        test_scenario::next_tx(&mut scenario, BOB); // switch to payer

        // settle with wrong amount (1400 instead of 1500)
        let receipt = settlement::settle(&mut invoice, 1400, salt, &clock, test_scenario::ctx(&mut scenario));

        unit_test::destroy(cap);
        unit_test::destroy(invoice);
        unit_test::destroy(receipt);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_auditor_gets_ciphertext() {
        let mut scenario = test_scenario::begin(ALICE);
        
        // Setup auditor registry
        let mut registry = auditor::new_registry(test_scenario::ctx(&mut scenario));
        auditor::register_auditor(
            &mut registry,
            AUDITOR,
            b"auditor_pubkey_bytes",
            test_scenario::ctx(&mut scenario)
        );

        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        // Create invoice with auditor pubkey
        let (invoice, cap) = invoice::create(
            b"enc",
            get_commitment(100, b"salt"),
            option::some(b"auditor_pubkey_bytes"),
            option::some(b"auditor_ciphertext_bytes"),
            BOB,
            string::utf8(b"Test"),
            string::utf8(b"R"),
            1000,
            &clock,
            test_scenario::ctx(&mut scenario)
        );

        // Issue decryption key to auditor
        test_scenario::next_tx(&mut scenario, AUDITOR);
        let decrypt_key = auditor::issue_decrypt_key(&invoice, &registry, test_scenario::ctx(&mut scenario));

        assert!(auditor::key_invoice_id(&decrypt_key) == sui::object::id(&invoice), 0);
        assert!(auditor::key_auditor_address(&decrypt_key) == AUDITOR, 1);

        let ciphertext = auditor::confirm_audit(&invoice, &decrypt_key);
        assert!(ciphertext == b"auditor_ciphertext_bytes", 2);

        unit_test::destroy(cap);
        unit_test::destroy(invoice);
        unit_test::destroy(decrypt_key);
        unit_test::destroy(registry);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }
}

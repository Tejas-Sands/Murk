module murk::errors {
    // Access control
    public fun e_unauthorized(): u64        { 0 }
    public fun e_cap_mismatch(): u64         { 1 }
    public fun e_invalid_address(): u64      { 2 }

    // Invoice lifecycle
    public fun e_invoice_not_pending(): u64   { 10 }
    public fun e_invoice_expired(): u64      { 11 }
    public fun e_invoice_not_expired(): u64   { 12 }
    public fun e_already_settled(): u64      { 13 }
    public fun e_already_cancelled(): u64    { 14 }
    public fun e_deadline_in_past(): u64      { 15 }

    // Payment validation
    public fun e_amount_mismatch(): u64      { 20 }
    public fun e_invalid_proof(): u64        { 21 }
    public fun e_zero_amount(): u64          { 22 }

    // Auditor
    public fun e_no_auditor_key(): u64        { 30 }
    public fun e_auditor_already_set(): u64   { 31 }
    public fun e_not_auditor(): u64          { 32 }

    // General
    public fun e_underflow(): u64           { 40 }
    public fun e_overflow(): u64            { 41 }
}

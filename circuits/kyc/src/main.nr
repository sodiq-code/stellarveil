// Circuit 1: zkKYC — Selective Disclosure
// Proves a user holds a valid KYC credential without revealing identity.
// Public inputs are bound to a live SEP-12 anchor customer ID.

use dep::std::hash::poseidon2;

// Merkle membership check (reused across circuits)
fn merkle_verify(leaf: Field, path: [Field; 10], indices: [u1; 10]) -> Field {
    let mut current = leaf;
    for i in 0..10 {
        let (left, right) = if indices[i] == 0 {
            (current, path[i])
        } else {
            (path[i], current)
        };
        current = poseidon2::Poseidon2::hash([left, right], 2);
    }
    current
}

fn main(
    // --- Private inputs ---
    credential_secret: Field,       // user's KYC credential secret (never revealed)
    age: u8,                        // age attribute for selective disclosure
    country_code: Field,            // hashed country identifier

    // --- Public inputs ---
    commitment: pub Field,          // Poseidon(credential_secret) stored on-chain
    sep12_customer_id: pub Field,   // hash of SDF anchor-issued customer ID
    anchor_link_hash: pub Field,    // Poseidon(credential_secret, sep12_customer_id)
    min_age: pub u8,                // minimum age threshold (18)
    allowed_countries: pub [Field; 10], // whitelist of allowed country hashes
) {
    // Constraint 1: credential commitment matches secret
    let computed_commitment = poseidon2::Poseidon2::hash([credential_secret], 1);
    assert(computed_commitment == commitment, "commitment mismatch: wrong credential_secret");

    // Constraint 2: age is sufficient
    assert(age >= min_age, "age below minimum threshold");

    // Constraint 3: country is in allowed set
    let mut country_allowed = false;
    for i in 0..10 {
        if allowed_countries[i] == country_code {
            country_allowed = true;
        }
    }
    assert(country_allowed, "country_code not in allowed list");

    // Constraint 4: anchor link hash binds this credential to the live SEP-12 customer ID
    let computed_link = poseidon2::Poseidon2::hash([credential_secret, sep12_customer_id], 2);
    assert(computed_link == anchor_link_hash, "anchor_link_hash mismatch: invalid sep12_customer_id binding");
}

#[test]
fn test_valid_compliant_user() {
    let secret = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    let sep12_id = 0xdeadbeef00000000000000000000000000000000000000000000000000000001;
    let commitment = dep::std::hash::poseidon2::Poseidon2::hash([secret], 1);
    let link = dep::std::hash::poseidon2::Poseidon2::hash([secret, sep12_id], 2);
    let countries: [Field; 10] = [0xAB, 0xCD, 0, 0, 0, 0, 0, 0, 0, 0];
    main(secret, 25, 0xAB, commitment, sep12_id, link, 18, countries);
}

#[test]
fn test_exact_minimum_age() {
    let secret = 0x1111111111111111111111111111111111111111111111111111111111111111;
    let sep12_id = 0x2222222222222222222222222222222222222222222222222222222222222222;
    let commitment = dep::std::hash::poseidon2::Poseidon2::hash([secret], 1);
    let link = dep::std::hash::poseidon2::Poseidon2::hash([secret, sep12_id], 2);
    let countries: [Field; 10] = [0x4E47, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // NG
    main(secret, 18, 0x4E47, commitment, sep12_id, link, 18, countries);
}

#[test(should_fail_with = "age below minimum threshold")]
fn test_fail_underage() {
    let secret = 0x3333333333333333333333333333333333333333333333333333333333333333;
    let sep12_id = 0x4444444444444444444444444444444444444444444444444444444444444444;
    let commitment = dep::std::hash::poseidon2::Poseidon2::hash([secret], 1);
    let link = dep::std::hash::poseidon2::Poseidon2::hash([secret, sep12_id], 2);
    let countries: [Field; 10] = [0x4E47, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    main(secret, 17, 0x4E47, commitment, sep12_id, link, 18, countries);
}

#[test(should_fail_with = "country_code not in allowed list")]
fn test_fail_disallowed_country() {
    let secret = 0x5555555555555555555555555555555555555555555555555555555555555555;
    let sep12_id = 0x6666666666666666666666666666666666666666666666666666666666666666;
    let commitment = dep::std::hash::poseidon2::Poseidon2::hash([secret], 1);
    let link = dep::std::hash::poseidon2::Poseidon2::hash([secret, sep12_id], 2);
    let countries: [Field; 10] = [0x4E47, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    main(secret, 22, 0x1234, commitment, sep12_id, link, 18, countries); // 0x1234 not in list
}

#[test(should_fail_with = "commitment mismatch: wrong credential_secret")]
fn test_fail_wrong_secret() {
    let secret = 0x7777777777777777777777777777777777777777777777777777777777777777;
    let wrong_secret = 0x8888888888888888888888888888888888888888888888888888888888888888;
    let sep12_id = 0x9999999999999999999999999999999999999999999999999999999999999999;
    let commitment = dep::std::hash::poseidon2::Poseidon2::hash([secret], 1); // commitment of real secret
    let link = dep::std::hash::poseidon2::Poseidon2::hash([wrong_secret, sep12_id], 2);
    let countries: [Field; 10] = [0x4E47, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    main(wrong_secret, 22, 0x4E47, commitment, sep12_id, link, 18, countries); // wrong secret used
}

#[test(should_fail_with = "anchor_link_hash mismatch: invalid sep12_customer_id binding")]
fn test_fail_tampered_sep12_id() {
    let secret = 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa;
    let real_sep12 = 0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb;
    let fake_sep12 = 0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc;
    let commitment = dep::std::hash::poseidon2::Poseidon2::hash([secret], 1);
    let link = dep::std::hash::poseidon2::Poseidon2::hash([secret, real_sep12], 2);
    let countries: [Field; 10] = [0x4E47, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    main(secret, 22, 0x4E47, commitment, fake_sep12, link, 18, countries); // fake sep12 used
}

// Circuit 3: ASP Allowlist Membership
// Proves a user is in the Association Set Provider's compliant set
// without revealing which leaf they occupy or their identity.

use dep::std::hash::poseidon2;

fn merkle_verify(leaf: Field, path: [Field; 16], indices: [u1; 16]) -> Field {
    let mut current = leaf;
    for i in 0..16 {
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
    identity_secret: Field,         // preimage of identity_commitment
    asp_path: [Field; 16],          // Merkle path in ASP tree
    asp_indices: [u1; 16],          // left/right flags

    // --- Public inputs ---
    asp_root: pub Field,            // ASP provider's published Merkle root
    identity_commitment: pub Field, // Poseidon(identity_secret) — known to ASP
) {
    // Constraint 1: commitment matches secret
    let computed_commitment = poseidon2::Poseidon2::hash([identity_secret], 1);
    assert(computed_commitment == identity_commitment, "identity_commitment mismatch");

    // Constraint 2: commitment exists in the ASP Merkle tree
    let computed_root = merkle_verify(identity_commitment, asp_path, asp_indices);
    assert(computed_root == asp_root, "asp_root mismatch: identity not in ASP set");
}

#[test]
fn test_valid_asp_member() {
    let secret = 0xaaaa000000000000000000000000000000000000000000000000000000000001;
    let commitment = dep::std::hash::poseidon2::Poseidon2::hash([secret], 1);
    let path: [Field; 16] = [0; 16];
    let idxs: [u1; 16] = [0; 16];
    // single-leaf ASP tree
    let root = {
        let mut cur = commitment;
        for i in 0..16 { cur = dep::std::hash::poseidon2::Poseidon2::hash([cur, 0], 2); }
        cur
    };
    main(secret, path, idxs, root, commitment);
}

#[test(should_fail_with = "identity_commitment mismatch")]
fn test_fail_wrong_secret() {
    let secret = 0xbbbb000000000000000000000000000000000000000000000000000000000002;
    let wrong_secret = 0xcccc000000000000000000000000000000000000000000000000000000000003;
    let commitment = dep::std::hash::poseidon2::Poseidon2::hash([secret], 1);
    let path: [Field; 16] = [0; 16];
    let idxs: [u1; 16] = [0; 16];
    let root = {
        let mut cur = commitment;
        for i in 0..16 { cur = dep::std::hash::poseidon2::Poseidon2::hash([cur, 0], 2); }
        cur
    };
    main(wrong_secret, path, idxs, root, commitment);
}

#[test(should_fail_with = "asp_root mismatch: identity not in ASP set")]
fn test_fail_not_in_asp() {
    let secret = 0xdddd000000000000000000000000000000000000000000000000000000000004;
    let commitment = dep::std::hash::poseidon2::Poseidon2::hash([secret], 1);
    let path: [Field; 16] = [0; 16];
    let idxs: [u1; 16] = [0; 16];
    let fake_root: Field = 0xbadbadbad;
    main(secret, path, idxs, fake_root, commitment);
}

#[test(should_fail_with = "asp_root mismatch: identity not in ASP set")]
fn test_fail_tampered_root() {
    let secret = 0xeeee000000000000000000000000000000000000000000000000000000000005;
    let commitment = dep::std::hash::poseidon2::Poseidon2::hash([secret], 1);
    let path: [Field; 16] = [0; 16];
    let idxs: [u1; 16] = [0; 16];
    let real_root = {
        let mut cur = commitment;
        for i in 0..16 { cur = dep::std::hash::poseidon2::Poseidon2::hash([cur, 0], 2); }
        cur
    };
    // tamper root by flipping last bit
    let tampered_root = real_root + 1;
    main(secret, path, idxs, tampered_root, commitment);
}

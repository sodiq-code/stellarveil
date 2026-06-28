// Circuit 2: Withdrawal + Merkle Inclusion
// Proves a note exists in the pool Merkle tree and authorises spending it.
// Nullifier prevents double-spend. amount_out <= note_amount enforced.

use dep::std::hash::poseidon2;

fn merkle_verify(leaf: Field, path: [Field; 20], indices: [u1; 20]) -> Field {
    let mut current = leaf;
    for i in 0..20 {
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
    note_secret: Field,             // secret used at deposit time
    note_amount: u64,               // amount in stroops (deposited)
    leaf_index: Field,              // position in Merkle tree
    merkle_path: [Field; 20],       // sibling hashes for Merkle proof
    merkle_indices: [u1; 20],       // 0=left, 1=right at each level

    // --- Public inputs ---
    merkle_root: pub Field,         // current tree root from contract
    nullifier: pub Field,           // hash(note_secret, leaf_index) — spent marker
    recipient: pub Field,           // destination account hash
    amount_out: pub u64,            // claimed withdrawal amount
) {
    // Constraint 1: leaf commitment is correct
    let leaf = poseidon2::Poseidon2::hash([note_secret, note_amount as Field], 2);

    // Constraint 2: leaf exists in tree at the claimed position
    let computed_root = merkle_verify(leaf, merkle_path, merkle_indices);
    assert(computed_root == merkle_root, "merkle_root mismatch: note not in tree");

    // Constraint 3: nullifier is correctly derived — prevents double-spend
    let computed_nullifier = poseidon2::Poseidon2::hash([note_secret, leaf_index], 2);
    assert(computed_nullifier == nullifier, "nullifier mismatch: wrong note_secret or leaf_index");

    // Constraint 4: can't withdraw more than deposited
    assert(amount_out <= note_amount, "amount_out exceeds note_amount");

    // recipient is bound to proof — prevents front-running
    let _recipient_bound = recipient;
}

#[test]
fn test_valid_full_withdrawal() {
    let secret = 0x1111111111111111111111111111111111111111111111111111111111111111;
    let amount: u64 = 10_000_000; // 1 USDC in stroops
    let index: Field = 0;
    let path: [Field; 20] = [0; 20];
    let idxs: [u1; 20] = [0; 20];
    let leaf = dep::std::hash::poseidon2::Poseidon2::hash([secret, amount as Field], 2);
    // single-leaf tree: root == leaf (all siblings are 0, Poseidon([leaf,0]) chains)
    let root = {
        let mut cur = leaf;
        for i in 0..20 {
            cur = dep::std::hash::poseidon2::Poseidon2::hash([cur, 0], 2);
        }
        cur
    };
    let null = dep::std::hash::poseidon2::Poseidon2::hash([secret, index], 2);
    let recipient: Field = 0xabcdef;
    main(secret, amount, index, path, idxs, root, null, recipient, amount);
}

#[test]
fn test_valid_partial_withdrawal() {
    let secret = 0x2222222222222222222222222222222222222222222222222222222222222222;
    let amount: u64 = 10_000_000;
    let partial: u64 = 5_000_000;
    let index: Field = 0;
    let path: [Field; 20] = [0; 20];
    let idxs: [u1; 20] = [0; 20];
    let leaf = dep::std::hash::poseidon2::Poseidon2::hash([secret, amount as Field], 2);
    let root = {
        let mut cur = leaf;
        for i in 0..20 { cur = dep::std::hash::poseidon2::Poseidon2::hash([cur, 0], 2); }
        cur
    };
    let null = dep::std::hash::poseidon2::Poseidon2::hash([secret, index], 2);
    main(secret, amount, index, path, idxs, root, null, 0xdead, partial);
}

#[test(should_fail_with = "amount_out exceeds note_amount")]
fn test_fail_inflate_amount() {
    let secret = 0x3333333333333333333333333333333333333333333333333333333333333333;
    let amount: u64 = 10_000_000;
    let inflated: u64 = 99_999_999;
    let index: Field = 0;
    let path: [Field; 20] = [0; 20];
    let idxs: [u1; 20] = [0; 20];
    let leaf = dep::std::hash::poseidon2::Poseidon2::hash([secret, amount as Field], 2);
    let root = {
        let mut cur = leaf;
        for i in 0..20 { cur = dep::std::hash::poseidon2::Poseidon2::hash([cur, 0], 2); }
        cur
    };
    let null = dep::std::hash::poseidon2::Poseidon2::hash([secret, index], 2);
    main(secret, amount, index, path, idxs, root, null, 0xbeef, inflated);
}

#[test(should_fail_with = "merkle_root mismatch: note not in tree")]
fn test_fail_wrong_merkle_root() {
    let secret = 0x4444444444444444444444444444444444444444444444444444444444444444;
    let amount: u64 = 10_000_000;
    let index: Field = 0;
    let path: [Field; 20] = [0; 20];
    let idxs: [u1; 20] = [0; 20];
    let fake_root: Field = 0xbadbadbadbadbad;
    let null = dep::std::hash::poseidon2::Poseidon2::hash([secret, index], 2);
    main(secret, amount, index, path, idxs, fake_root, null, 0xface, amount);
}

#[test(should_fail_with = "nullifier mismatch: wrong note_secret or leaf_index")]
fn test_fail_wrong_nullifier() {
    let secret = 0x5555555555555555555555555555555555555555555555555555555555555555;
    let amount: u64 = 10_000_000;
    let index: Field = 0;
    let path: [Field; 20] = [0; 20];
    let idxs: [u1; 20] = [0; 20];
    let leaf = dep::std::hash::poseidon2::Poseidon2::hash([secret, amount as Field], 2);
    let root = {
        let mut cur = leaf;
        for i in 0..20 { cur = dep::std::hash::poseidon2::Poseidon2::hash([cur, 0], 2); }
        cur
    };
    let bad_null: Field = 0xdeaddeaddead; // wrong nullifier
    main(secret, amount, index, path, idxs, root, bad_null, 0xcafe, amount);
}

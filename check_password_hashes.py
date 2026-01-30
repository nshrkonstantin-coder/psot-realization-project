import hashlib

# List of unique hashes from the database
hashes = [
    "fcc4f72cb68d8eb5deea0d76c3e8a83126affbe1c8bacc586c3fc49faf10a2a2",
    "b22e458b1699392ea702c88051af872d833aa7ee9973b8f9fcd9cabecc7ba601",
    "dd6415d6bf0d1238f4df9e061f03281a9776cbcf7633c1f7ac2ef2aeaff51c01",
    "a2a09ee00caeb96ea558094f9dddd540aaed30307397eb9d1634e1c78b1a9487",
    "e7e69907ab207e2631f55730d46fdce493d18f58a322ee4094206b0638b89266",
    "9d1726226bd57f5760fb39835ff9faa8238def70c966d39ab10dee0c3d0c4535",
    "93fc644fcf1927c69e2e4bfe1deddd2d6de5fda1c0b40778bfb581ae568051b4",
    "7f45a6679181e8476c53f860f7ff314c62168a3ff35b5698b00c8e08d4757d69",
    "52b8e43ff14c8965e767bee5802b07139a51ecb4683938846bfd191eaa543c97",
    "24f23d9134792899a6c8eb7c508e3715d7c7cceaca55e46515e5415d6597cd02",
    "2812c943ddee119484e12918f57d6ecf2669bfeb1ed073f6038a5eef1405e14a"
]

# Password variants to test
password_variants = {
    "original": "!2345678",
    "trailing_space": "!2345678 ",
    "leading_space": " !2345678",
    "both_spaces": " !2345678 "
}

# Function to compute SHA256 hash
def compute_sha256(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Compute hashes for all variants
variant_hashes = {}
for variant_name, password in password_variants.items():
    hash_value = compute_sha256(password)
    variant_hashes[variant_name] = hash_value
    print(f"{variant_name:20} '{password}' -> {hash_value}")

print("\n" + "="*80 + "\n")

# Check which database hashes match which variants
results = {
    "with_spaces": [],
    "without_spaces": [],
    "no_match": []
}

for db_hash in hashes:
    matched = False
    for variant_name, variant_hash in variant_hashes.items():
        if db_hash == variant_hash:
            matched = True
            if variant_name == "original":
                results["without_spaces"].append({
                    "hash": db_hash,
                    "variant": variant_name
                })
            else:
                results["with_spaces"].append({
                    "hash": db_hash,
                    "variant": variant_name
                })
            print(f"MATCH: {db_hash}")
            print(f"       Variant: {variant_name} ('{password_variants[variant_name]}')")
            print()
            break
    
    if not matched:
        results["no_match"].append(db_hash)

print("="*80)
print("\nSUMMARY:")
print(f"\nHashes matching passwords WITH spaces ({len(results['with_spaces'])}):")
if results["with_spaces"]:
    for item in results["with_spaces"]:
        print(f"  - {item['hash']}")
        print(f"    Variant: {item['variant']} ('{password_variants[item['variant']]}')")
else:
    print("  None")

print(f"\nHashes matching passwords WITHOUT spaces ({len(results['without_spaces'])}):")
if results["without_spaces"]:
    for item in results["without_spaces"]:
        print(f"  - {item['hash']}")
        print(f"    Variant: {item['variant']} ('{password_variants[item['variant']]}')")
else:
    print("  None")

print(f"\nHashes with NO MATCH ({len(results['no_match'])}):")
if results["no_match"]:
    for hash_value in results["no_match"]:
        print(f"  - {hash_value}")
else:
    print("  None")

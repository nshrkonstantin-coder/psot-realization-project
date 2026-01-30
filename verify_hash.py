import hashlib

db_hash = "2812c943ddee119484e12918f57d6ecf2669bfeb1ed073f6038a5eef1405e14a"

passwords = [
    "!2345678",
    "12345678",
    "!12345678"
]

for i, password in enumerate(passwords, 1):
    hash_result = hashlib.sha256(password.encode()).hexdigest()
    print(f"{i}. {password}: {hash_result}")
    if hash_result == db_hash:
        print(f"\nMATCH FOUND: {password}")

print(f"\nDatabase hash: {db_hash}")

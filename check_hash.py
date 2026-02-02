import hashlib

target_hash = "e7e69907ab207e2631f55730d46fdce493d18f58a322ee4094206b0638b89266"

passwords = [
    "!2345678",
    "!2345678 ",
    " !2345678",
    " !2345678 "
]

print("Проверка паролей:")
print("-" * 80)

for i, password in enumerate(passwords, 1):
    hash_obj = hashlib.sha256(password.encode('utf-8'))
    computed_hash = hash_obj.hexdigest()
    
    match = "✓ СОВПАДЕНИЕ!" if computed_hash == target_hash else "✗"
    
    print(f"{i}. Пароль: '{password}' (длина: {len(password)})")
    print(f"   SHA256: {computed_hash}")
    print(f"   {match}")
    print()

print("-" * 80)
print(f"Целевой хеш: {target_hash}")

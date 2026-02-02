import hashlib

target_hash = "e7e69907ab207e2631f55730d46fdce493d18f58a322ee4094206b0638b89266"

passwords = [
    ("!2345678", "без пробелов"),
    ("!2345678 ", "пробел в конце"),
    (" !2345678", "пробел в начале"),
    (" !2345678 ", "пробелы с обеих сторон")
]

print("Проверка паролей:")
print("=" * 80)

matched = None

for password, description in passwords:
    computed_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
    is_match = computed_hash == target_hash
    
    print(f"\nПароль: '{password}' ({description})")
    print(f"Длина: {len(password)} символов")
    print(f"SHA256: {computed_hash}")
    
    if is_match:
        print(">>> СОВПАДЕНИЕ! <<<")
        matched = (password, description)
    else:
        print("Не совпадает")

print("\n" + "=" * 80)
print(f"Целевой хеш: {target_hash}")

if matched:
    print(f"\n>>> РЕЗУЛЬТАТ: Пароль '{matched[0]}' ({matched[1]}) соответствует хешу <<<")
else:
    print("\n>>> Ни один из вариантов не совпал <<<")

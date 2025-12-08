import hashlib

password = "123!!"
password_hash = hashlib.sha256(password.encode()).hexdigest()

print(f"Password: {password}")
print(f"SHA256 Hash: {password_hash}")

# Проверка текущего хеша в базе
current_hash = "df2700e85a8ba0bc1e97e45471fc5ed2127c5fd24f3f605eaa6c241e0c16d45d"
print(f"\nCurrent hash in DB: {current_hash}")
print(f"Hashes match: {password_hash == current_hash}")

#!/usr/bin/env python3
import hashlib

password = "Qwerdsx123!"
password_hash = hashlib.sha256(password.encode()).hexdigest()
print(f"Password: {password}")
print(f"SHA-256 Hash: {password_hash}")

# For SQL migration:
print(f"\nSQL UPDATE command:")
print(f"UPDATE users SET password_hash = '{password_hash}' WHERE email = 'Gl.adm@adm.ru';")

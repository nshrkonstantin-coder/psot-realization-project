import hashlib

# Generate password hash for "Qwerdsx123!"
password = "Qwerdsx123!"
password_hash = hashlib.sha256(password.encode()).hexdigest()
print(f"Password hash for '{password}': {password_hash}")

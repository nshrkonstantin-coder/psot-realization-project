import hashlib

passwords = [
    "!23Qazxcvbnm",
    "!23Qazxcvbnm ",
    " !23Qazxcvbnm",
    " !23Qazxcvbnm "
]

print("SHA256 хеши паролей:\n")
for i, password in enumerate(passwords, 1):
    hash_obj = hashlib.sha256(password.encode('utf-8'))
    hash_hex = hash_obj.hexdigest()
    print(f'{i}. "{password}": {hash_hex}')

import hashlib

passwords = ["!2345678", "!2345678 ", " !2345678", "!2345678\n", "!2345678\r\n"]
target = "2812c943ddee119484e12918f57d6ecf2669bfeb1ed073f6038a5eef1405e14a"

print("Checking password variants against target hash:")
print(f"Target: {target}\n")

for p in passwords:
    h = hashlib.sha256(p.encode()).hexdigest()
    if h == target:
        print(f"MATCH FOUND!")
        print(f"  Password: '{p}'")
        print(f"  Repr: {repr(p)}")
        print(f"  Hash: {h}")
    else:
        print(f"NO: {repr(p):<20} -> {h}")

print("\nDone.")

-- Fix password hash for remaining users with trailing space in password
-- Old hash: e7e69907ab207e2631f55730d46fdce493d18f58a322ee4094206b0638b89266 (password: "!2345678 " with space)
-- New hash: 1330a03b1234e780452a1be6b0c67b65bd5e31e7a96bdb87f8d94bfb36fdc6c5 (password: "!2345678" without space)

UPDATE users 
SET password_hash = '1330a03b1234e780452a1be6b0c67b65bd5e31e7a96bdb87f8d94bfb36fdc6c5'
WHERE password_hash = 'e7e69907ab207e2631f55730d46fdce493d18f58a322ee4094206b0638b89266';
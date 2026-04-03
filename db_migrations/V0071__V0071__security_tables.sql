CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    success BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON t_p80499285_psot_realization_pro.login_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON t_p80499285_psot_realization_pro.login_attempts(ip_address, created_at);

CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.ip_blocks (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    blocked_until TIMESTAMP NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.login_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p80499285_psot_realization_pro.users(id),
    email VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    fail_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_log_user ON t_p80499285_psot_realization_pro.login_log(user_id, created_at);

CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.twofa_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p80499285_psot_realization_pro.users(id),
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_twofa_user ON t_p80499285_psot_realization_pro.twofa_codes(user_id, expires_at);

CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.known_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p80499285_psot_realization_pro.users(id),
    device_fingerprint VARCHAR(255) NOT NULL,
    user_agent TEXT,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_fingerprint)
);

CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.integration_1c_logs (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(20) NOT NULL,
    sync_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL,
    employees_count INTEGER DEFAULT 0,
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_integration_1c_logs_sync_date ON t_p80499285_psot_realization_pro.integration_1c_logs(sync_date DESC);

ALTER TABLE t_p80499285_psot_realization_pro.users 
ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50);

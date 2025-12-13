CREATE TABLE production_prescriptions (
    id SERIAL PRIMARY KEY,
    issuer_fio VARCHAR(255) NOT NULL,
    issuer_position VARCHAR(255) NOT NULL,
    issuer_department VARCHAR(255),
    issuer_organization VARCHAR(255) NOT NULL,
    assigned_user_id INTEGER NOT NULL,
    assigned_user_fio VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE production_prescription_violations (
    id SERIAL PRIMARY KEY,
    prescription_id INTEGER NOT NULL,
    violation_text TEXT NOT NULL,
    assigned_user_id INTEGER NOT NULL,
    assigned_user_fio VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'in_work',
    deadline DATE NOT NULL,
    completed_at TIMESTAMP,
    confirmed_by_issuer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_production_prescription FOREIGN KEY (prescription_id) REFERENCES production_prescriptions(id),
    CONSTRAINT check_violation_status CHECK (status IN ('in_work', 'completed', 'overdue'))
);

CREATE INDEX idx_production_prescriptions_assigned_user ON production_prescriptions(assigned_user_id);
CREATE INDEX idx_production_violations_prescription ON production_prescription_violations(prescription_id);
CREATE INDEX idx_production_violations_assigned_user ON production_prescription_violations(assigned_user_id);
CREATE INDEX idx_production_violations_status ON production_prescription_violations(status);

-- Таблица поручений отдела ОТиПБ
CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.ot_orders (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline DATE NOT NULL,
    responsible_person VARCHAR(255) NOT NULL,
    issued_by VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'completed', 'extended')),
    extended_deadline DATE,
    organization_id INTEGER REFERENCES t_p80499285_psot_realization_pro.organizations(id),
    assigned_to_user_id INTEGER REFERENCES t_p80499285_psot_realization_pro.users(id),
    created_by_user_id INTEGER REFERENCES t_p80499285_psot_realization_pro.users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ot_orders_org ON t_p80499285_psot_realization_pro.ot_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_ot_orders_status ON t_p80499285_psot_realization_pro.ot_orders(status);
CREATE INDEX IF NOT EXISTS idx_ot_orders_assigned ON t_p80499285_psot_realization_pro.ot_orders(assigned_to_user_id);

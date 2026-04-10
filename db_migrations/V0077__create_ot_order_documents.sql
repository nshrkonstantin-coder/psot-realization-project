CREATE TABLE t_p80499285_psot_realization_pro.ot_order_documents (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES t_p80499285_psot_realization_pro.ot_orders(id),
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NULL,
    uploaded_by_user_id INTEGER NULL REFERENCES t_p80499285_psot_realization_pro.users(id),
    uploaded_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_ot_order_documents_order_id ON t_p80499285_psot_realization_pro.ot_order_documents(order_id);
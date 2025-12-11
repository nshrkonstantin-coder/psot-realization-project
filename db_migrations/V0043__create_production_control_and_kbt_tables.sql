-- Таблица для предписаний производственного контроля
CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.production_control_reports (
    id SERIAL PRIMARY KEY,
    doc_number VARCHAR(50) NOT NULL,
    doc_date DATE NOT NULL,
    recipient_user_id INTEGER REFERENCES t_p80499285_psot_realization_pro.users(id),
    recipient_name VARCHAR(255),
    department VARCHAR(255) NOT NULL,
    witness TEXT,
    issuer_name VARCHAR(255) NOT NULL,
    issuer_position VARCHAR(255),
    issue_date DATE NOT NULL,
    user_id INTEGER REFERENCES t_p80499285_psot_realization_pro.users(id),
    organization_id INTEGER REFERENCES t_p80499285_psot_realization_pro.organizations(id),
    word_file_url TEXT,
    pdf_file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для нарушений в предписаниях
CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.production_control_violations (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES t_p80499285_psot_realization_pro.production_control_reports(id),
    item_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    measures TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для фото нарушений
CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.production_control_photos (
    id SERIAL PRIMARY KEY,
    violation_id INTEGER REFERENCES t_p80499285_psot_realization_pro.production_control_violations(id),
    photo_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для подписей принявших предписание
CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.production_control_signatures (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES t_p80499285_psot_realization_pro.production_control_reports(id),
    user_id INTEGER REFERENCES t_p80499285_psot_realization_pro.users(id),
    user_name VARCHAR(255) NOT NULL,
    signature_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для отчётов КБТ
CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.kbt_reports (
    id SERIAL PRIMARY KEY,
    department VARCHAR(255) NOT NULL,
    head_name VARCHAR(255) NOT NULL,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    sick_count VARCHAR(50),
    suspended VARCHAR(50),
    injuries VARCHAR(50),
    micro_injuries VARCHAR(50),
    sick_leave VARCHAR(50),
    accidents VARCHAR(50),
    acts_count VARCHAR(50),
    inspector VARCHAR(255),
    violations_count VARCHAR(50),
    responsible_person VARCHAR(255),
    fixed_count VARCHAR(50),
    in_progress_count VARCHAR(50),
    overdue_count VARCHAR(50),
    reasons TEXT,
    actions_taken TEXT,
    internal_checks_count VARCHAR(50),
    internal_violations_count VARCHAR(50),
    internal_responsible VARCHAR(255),
    internal_fixed_count VARCHAR(50),
    internal_in_progress_count VARCHAR(50),
    internal_overdue_count VARCHAR(50),
    internal_reasons TEXT,
    internal_actions_taken TEXT,
    gov_agency VARCHAR(255),
    act_number VARCHAR(100),
    gov_violations VARCHAR(50),
    gov_responsible VARCHAR(255),
    gov_fixed_count VARCHAR(50),
    gov_in_progress_count VARCHAR(50),
    gov_overdue_count VARCHAR(50),
    gov_reasons TEXT,
    pab_plan_department VARCHAR(50),
    pab_fact_department VARCHAR(50),
    pab_diff_department VARCHAR(50),
    pab_plan_personal VARCHAR(50),
    pab_fact_personal VARCHAR(50),
    pab_diff_personal VARCHAR(50),
    user_id INTEGER REFERENCES t_p80499285_psot_realization_pro.users(id),
    organization_id INTEGER REFERENCES t_p80499285_psot_realization_pro.organizations(id),
    word_file_url TEXT,
    pdf_file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_pc_reports_org ON t_p80499285_psot_realization_pro.production_control_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_pc_reports_user ON t_p80499285_psot_realization_pro.production_control_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_kbt_reports_org ON t_p80499285_psot_realization_pro.kbt_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_kbt_reports_user ON t_p80499285_psot_realization_pro.kbt_reports(user_id);
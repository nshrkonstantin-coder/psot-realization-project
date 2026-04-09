CREATE TABLE IF NOT EXISTS excel_mail_log (
    id SERIAL PRIMARY KEY,
    track_id VARCHAR(64) UNIQUE NOT NULL,
    sender_user_id INTEGER,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500),
    sender_display VARCHAR(255),
    status VARCHAR(20) DEFAULT 'sent',
    sent_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    row_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_excel_mail_log_track_id ON excel_mail_log(track_id);
CREATE INDEX IF NOT EXISTS idx_excel_mail_log_sender ON excel_mail_log(sender_user_id);

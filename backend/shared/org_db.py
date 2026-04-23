"""
Утилита роутинга подключений к БД по организации.

Логика:
  1. Проверяем секрет ORG_{org_id}_DATABASE_URL — если есть, используем его
  2. Иначе подключаемся к основной БД (DATABASE_URL)

Это позволяет любой организации перенести свои данные на собственные ресурсы
без изменения кода функций — достаточно добавить секрет ORG_N_DATABASE_URL.
"""
import os
import psycopg2


def get_org_db_connection(org_id: int | str | None):
    """
    Возвращает (conn, schema) для указанной организации.

    Если у организации есть собственная БД (секрет ORG_{org_id}_DATABASE_URL),
    подключается к ней. Иначе — к основной БД проекта.

    Использование:
        conn, schema = get_org_db_connection(org_id)
        cur = conn.cursor()
        cur.execute(f"SELECT * FROM {schema}.users WHERE ...")
        conn.commit()
        cur.close()
        conn.close()
    """
    main_dsn = os.environ['DATABASE_URL']
    main_schema = os.environ.get('MAIN_DB_SCHEMA', 't_p80499285_psot_realization_pro')

    if org_id:
        org_dsn = os.environ.get(f'ORG_{org_id}_DATABASE_URL')
        org_schema = os.environ.get(f'ORG_{org_id}_DB_SCHEMA', main_schema)
        if org_dsn:
            conn = psycopg2.connect(org_dsn)
            return conn, org_schema

    conn = psycopg2.connect(main_dsn)
    return conn, main_schema


def get_main_db_connection():
    """Всегда возвращает подключение к основной БД (для суперадмина и системных операций)."""
    dsn = os.environ['DATABASE_URL']
    schema = os.environ.get('MAIN_DB_SCHEMA', 't_p80499285_psot_realization_pro')
    return psycopg2.connect(dsn), schema

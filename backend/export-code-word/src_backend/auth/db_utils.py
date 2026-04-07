"""
Вспомогательные функции для работы с БД в модуле авторизации
Использует connection pool для оптимизации производительности
"""
import sys
import os

# Добавляем путь к shared модулям
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.db_pool import get_connection, return_connection
from shared import cache

def get_organization_by_code(code: str) -> dict | None:
    """
    Получить организацию по коду регистрации
    Использует кэш для снижения нагрузки на БД
    
    Returns:
        dict с полями id, name или None если не найдена
    """
    # Проверяем кэш (код регистрации уникален, можно кэшировать на 5 минут)
    cache_key = f'org_by_code:{code}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    
    # Запрашиваем из БД
    conn = get_connection()
    try:
        cur = conn.cursor()
        code_escaped = code.replace("'", "''")
        cur.execute(
            f"SELECT id, name FROM t_p80499285_psot_realization_pro.organizations "
            f"WHERE registration_code = '{code_escaped}' AND is_active = true"
        )
        org_result = cur.fetchone()
        cur.close()
        
        if org_result:
            result = {'id': org_result[0], 'name': org_result[1]}
            cache.set(cache_key, result, ttl_seconds=300)  # 5 минут
            return result
        return None
    finally:
        return_connection(conn)

def check_user_exists(email: str) -> bool:
    """
    Проверить существование пользователя по email
    
    Returns:
        True если пользователь существует
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        email_escaped = email.replace("'", "''")
        cur.execute(
            f"SELECT 1 FROM t_p80499285_psot_realization_pro.users "
            f"WHERE email = '{email_escaped}' LIMIT 1"
        )
        exists = cur.fetchone() is not None
        cur.close()
        return exists
    finally:
        return_connection(conn)

def authenticate_user(email: str, password_hash: str) -> dict | None:
    """
    Аутентифицировать пользователя
    
    Returns:
        dict с данными пользователя или None если не найден
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        email_escaped = email.replace("'", "''")
        password_hash_escaped = password_hash.replace("'", "''")
        
        cur.execute(f"""
            SELECT u.id, u.fio, u.email, u.role, u.company, u.organization_id, 
                   o.name as organization_name, u.position, u.subdivision,
                   u.phone, u.avatar_url
            FROM t_p80499285_psot_realization_pro.users u
            LEFT JOIN t_p80499285_psot_realization_pro.organizations o ON u.organization_id = o.id
            WHERE u.email = '{email_escaped}' AND u.password_hash = '{password_hash_escaped}'
        """)
        
        user_row = cur.fetchone()
        cur.close()
        
        if user_row:
            return {
                'id': user_row[0],
                'fio': user_row[1],
                'email': user_row[2],
                'role': user_row[3],
                'company': user_row[4],
                'organizationId': user_row[5],
                'organizationName': user_row[6],
                'position': user_row[7],
                'subdivision': user_row[8],
                'phone': user_row[9],
                'avatar_url': user_row[10]
            }
        return None
    finally:
        return_connection(conn)

def create_user(email: str, password_hash: str, fio: str, 
                organization_id: int | None, company: str | None,
                position: str | None, subdivision: str | None,
                phone: str | None = None) -> int:
    """
    Создать нового пользователя
    
    Returns:
        ID созданного пользователя
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Экранирование
        email_escaped = email.replace("'", "''")
        password_hash_escaped = password_hash.replace("'", "''")
        fio_escaped = fio.replace("'", "''")
        company_escaped = company.replace("'", "''") if company else 'NULL'
        position_escaped = position.replace("'", "''") if position else 'NULL'
        subdivision_escaped = subdivision.replace("'", "''") if subdivision else 'NULL'
        phone_escaped = phone.replace("'", "''") if phone else 'NULL'
        
        # Определяем роль: если organization_id есть, то user, иначе admin
        role = 'user' if organization_id else 'admin'
        org_id_str = str(organization_id) if organization_id else 'NULL'
        
        cur.execute(f"""
            INSERT INTO t_p80499285_psot_realization_pro.users 
            (email, password_hash, fio, role, company, organization_id, position, subdivision, phone)
            VALUES ('{email_escaped}', '{password_hash_escaped}', '{fio_escaped}', 
                    '{role}', '{company_escaped}', {org_id_str}, 
                    '{position_escaped}', '{subdivision_escaped}', 
                    {f"'{phone_escaped}'" if phone else 'NULL'})
            RETURNING id
        """)
        
        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        
        return user_id
    finally:
        return_connection(conn)

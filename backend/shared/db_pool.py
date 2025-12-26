"""
Модуль для управления пулом соединений с PostgreSQL
Оптимизирован для высоконагруженных систем (300+ пользователей)
"""
import os
import psycopg2
from psycopg2 import pool
from typing import Optional

# Глобальный пул соединений (переиспользуется между вызовами функции)
_connection_pool: Optional[pool.SimpleConnectionPool] = None

def get_connection_pool():
    """
    Получить или создать пул соединений с БД
    
    Настройки пула:
    - minconn: 2 - минимальное количество соединений
    - maxconn: 20 - максимальное количество соединений
    - Переиспользуются между вызовами Cloud Function
    """
    global _connection_pool
    
    if _connection_pool is None or _connection_pool.closed:
        dsn = os.environ.get('DATABASE_URL')
        _connection_pool = pool.SimpleConnectionPool(
            minconn=2,
            maxconn=20,
            dsn=dsn,
            # Параметры оптимизации
            connect_timeout=10,
            keepalives=1,
            keepalives_idle=30,
            keepalives_interval=10,
            keepalives_count=5
        )
    
    return _connection_pool

def get_connection():
    """
    Получить соединение из пула
    ВАЖНО: после использования вызвать return_connection()
    """
    pool_instance = get_connection_pool()
    return pool_instance.getconn()

def return_connection(conn):
    """
    Вернуть соединение обратно в пул
    """
    pool_instance = get_connection_pool()
    pool_instance.putconn(conn)

def close_all_connections():
    """
    Закрыть все соединения в пуле (обычно не требуется)
    """
    global _connection_pool
    if _connection_pool is not None:
        _connection_pool.closeall()
        _connection_pool = None

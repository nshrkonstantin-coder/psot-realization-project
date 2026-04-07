"""
Простой in-memory кэш для часто запрашиваемых данных
Снижает нагрузку на БД при высокой конкуренции (300+ пользователей)
"""
from typing import Any, Optional
from datetime import datetime, timedelta

# Глобальный словарь кэша (переиспользуется между вызовами)
_cache = {}

class CacheEntry:
    """Запись в кэше с временем жизни"""
    def __init__(self, value: Any, ttl_seconds: int = 60):
        self.value = value
        self.expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
    
    def is_expired(self) -> bool:
        return datetime.now() > self.expires_at

def get(key: str) -> Optional[Any]:
    """
    Получить значение из кэша
    Возвращает None если ключа нет или данные устарели
    """
    if key in _cache:
        entry = _cache[key]
        if not entry.is_expired():
            return entry.value
        else:
            # Удаляем устаревшую запись
            del _cache[key]
    return None

def set(key: str, value: Any, ttl_seconds: int = 60):
    """
    Сохранить значение в кэш
    
    Args:
        key: Ключ
        value: Значение
        ttl_seconds: Время жизни в секундах (по умолчанию 60)
    """
    _cache[key] = CacheEntry(value, ttl_seconds)

def delete(key: str):
    """Удалить значение из кэша"""
    if key in _cache:
        del _cache[key]

def clear():
    """Очистить весь кэш"""
    _cache.clear()

def get_stats() -> dict:
    """Получить статистику кэша (для отладки)"""
    total = len(_cache)
    expired = sum(1 for entry in _cache.values() if entry.is_expired())
    return {
        'total_entries': total,
        'expired_entries': expired,
        'active_entries': total - expired
    }

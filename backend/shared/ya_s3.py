"""
Утилита для работы с Яндекс Object Storage (S3).
Используется всеми backend-функциями продукта.
"""
import os
import boto3
from botocore.client import Config

YA_ENDPOINT = 'https://storage.yandexcloud.net'
YA_REGION = 'ru-central1'


def get_s3_client():
    """Возвращает boto3-клиент для Яндекс Object Storage."""
    return boto3.client(
        's3',
        endpoint_url=YA_ENDPOINT,
        aws_access_key_id=os.environ['YA_S3_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['YA_S3_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4'),
        region_name=YA_REGION
    )


def get_bucket():
    """Возвращает название бакета."""
    return os.environ.get('YA_S3_BUCKET_NAME', 'psot-files')


def get_public_url(key: str) -> str:
    """Формирует публичный URL файла в Яндекс Object Storage."""
    bucket = get_bucket()
    return f'{YA_ENDPOINT}/{bucket}/{key}'

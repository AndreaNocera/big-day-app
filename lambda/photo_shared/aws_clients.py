import os

import boto3
from botocore.config import Config


IS_LOCAL = os.getenv("ENV", "local") == "local"
_REGION = os.getenv("AWS_REGION", "eu-west-1")
_LOCAL_CREDENTIALS = {
    "aws_access_key_id": os.getenv("AWS_ACCESS_KEY_ID", "dummy"),
    "aws_secret_access_key": os.getenv("AWS_SECRET_ACCESS_KEY", "dummy"),
}

dynamodb = boto3.resource(
    "dynamodb",
    endpoint_url="http://dynamodb-local:8000" if IS_LOCAL else None,
    region_name=_REGION,
    **(_LOCAL_CREDENTIALS if IS_LOCAL else {}),
)

_s3_config = {
    "endpoint_url": os.getenv("S3_ENDPOINT_URL", "http://localstack:4566") if IS_LOCAL else None,
    "region_name": _REGION,
    **(_LOCAL_CREDENTIALS if IS_LOCAL else {}),
}
if IS_LOCAL:
    _s3_config["config"] = Config(s3={"addressing_style": "path"})
s3 = boto3.client("s3", **_s3_config)

sqs = boto3.client(
    "sqs",
    endpoint_url=os.getenv("SQS_ENDPOINT_URL", "http://localstack:4566") if IS_LOCAL else None,
    region_name=_REGION,
    **(_LOCAL_CREDENTIALS if IS_LOCAL else {}),
)

if IS_LOCAL:
    _public_s3_config = dict(_s3_config)
    _public_s3_config["endpoint_url"] = os.getenv(
        "S3_PUBLIC_ENDPOINT_URL", "http://localhost:4566"
    )
    public_s3 = boto3.client("s3", **_public_s3_config)
else:
    public_s3 = s3


def presigning_s3_client(default_client):
    """Firma con l'host pubblico locale, che e' parte della firma SigV4."""
    return public_s3 if IS_LOCAL else default_client

"""Invio idempotente del lavoro foto alla coda usata da AWS e LocalStack."""

import json
import os
from urllib.parse import quote_plus

from photo_shared.aws_clients import sqs


def enqueue_photo_processing(bucket_name: str, s3_key: str):
    queue_url = os.getenv("PHOTO_PROCESSING_QUEUE_URL")
    if not queue_url:
        raise RuntimeError("PHOTO_PROCESSING_QUEUE_URL non configurata")
    event = {
        "Records": [{
            "eventSource": "aws:s3",
            "eventName": "ObjectCreated:Reconcile",
            "s3": {
                "bucket": {"name": bucket_name},
                "object": {"key": quote_plus(s3_key)},
            },
        }]
    }
    return sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(event))

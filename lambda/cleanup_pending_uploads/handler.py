import os
import sys
import time
from datetime import datetime, timezone

from botocore.exceptions import ClientError

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from photo_shared.aws_clients import dynamodb, s3
from photo_shared.media_utils import validate_stored_object
from photo_shared.photo_queue import enqueue_photo_processing


def _bucket_name():
    if os.getenv("ENV", "local") == "local":
        return os.getenv("S3_BUCKET", "wedding-photos-local")
    return os.getenv("S3_BUCKET", "wedding-photos-prod")


def _load_candidates(table, now: int, audit_cutoff: int):
    kwargs = {
        "FilterExpression": (
            "(#status = :pending AND cleanupAfter <= :now) OR "
            "#status = :cleaning OR "
            "(#status = :failed AND failedAt <= :audit_cutoff)"
        ),
        "ExpressionAttributeNames": {"#status": "uploadStatus"},
        "ExpressionAttributeValues": {
            ":pending": "pending",
            ":cleaning": "cleaning",
            ":failed": "failed",
            ":now": now,
            ":audit_cutoff": audit_cutoff,
        },
    }
    items = []
    while True:
        response = table.scan(**kwargs)
        items.extend(response.get("Items", []))
        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            return items
        kwargs["ExclusiveStartKey"] = last_key


def _head_object(bucket_name: str, key: str):
    try:
        return s3.head_object(Bucket=bucket_name, Key=key)
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") in {
            "404", "NoSuchKey", "NotFound"
        }:
            return None
        raise


def _delete_assets(bucket_name: str, item: dict):
    keys = [key for key in (item.get("s3Key"), item.get("thumbKey")) if key]
    if not keys:
        return
    response = s3.delete_objects(
        Bucket=bucket_name,
        Delete={"Objects": [{"Key": key} for key in keys], "Quiet": True},
    )
    if response.get("Errors"):
        raise RuntimeError("incomplete object cleanup")


def _fail_pending(table, item: dict, bucket_name: str, now: int, failure_code: str):
    try:
        table.update_item(
            Key={"PK": item["PK"]},
            UpdateExpression=(
                "SET uploadStatus = :cleaning, processingStatus = :failed, "
                "cleanupStartedAt = :now, processingUpdatedAt = :updated"
            ),
            ConditionExpression="uploadStatus IN (:pending, :cleaning)",
            ExpressionAttributeValues={
                ":pending": "pending",
                ":cleaning": "cleaning",
                ":failed": "failed",
                ":now": now,
                ":updated": datetime.now(timezone.utc).isoformat(),
            },
        )
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            return False
        raise

    _delete_assets(bucket_name, item)
    table.update_item(
        Key={"PK": item["PK"]},
        UpdateExpression=(
            "SET uploadStatus = :failed, processingStatus = :failed, "
            "failedAt = :now, failureCode = :code, processingUpdatedAt = :updated "
            "REMOVE s3Key, thumbKey"
        ),
        ConditionExpression="uploadStatus = :cleaning",
        ExpressionAttributeValues={
            ":cleaning": "cleaning",
            ":failed": "failed",
            ":now": now,
            ":code": failure_code,
            ":updated": datetime.now(timezone.utc).isoformat(),
        },
    )
    return True


def handler(event, context):
    """Riconcilia pending scaduti e conserva per 48 ore l'audit dei KO."""
    table = dynamodb.Table("WeddingPhotos")
    bucket_name = _bucket_name()
    now = int(time.time())
    retention = int(os.getenv("UPLOAD_FAILED_AUDIT_RETENTION_SECONDS", "172800"))
    candidates = _load_candidates(table, now, now - retention)
    result = {"requeued": 0, "failed": 0, "purged": 0, "errors": 0}

    for item in candidates:
        try:
            status = item.get("uploadStatus")
            if status == "failed":
                table.delete_item(
                    Key={"PK": item["PK"]},
                    ConditionExpression="uploadStatus = :failed AND failedAt <= :cutoff",
                    ExpressionAttributeValues={
                        ":failed": "failed",
                        ":cutoff": now - retention,
                    },
                )
                result["purged"] += 1
                continue

            if status == "cleaning":
                if _fail_pending(
                    table, item, bucket_name, now,
                    item.get("failureCode") or "UPLOAD_NOT_RECEIVED",
                ):
                    result["failed"] += 1
                continue

            s3_key = item.get("s3Key")
            head = _head_object(bucket_name, s3_key) if s3_key else None
            if not head:
                if _fail_pending(table, item, bucket_name, now, "UPLOAD_NOT_RECEIVED"):
                    result["failed"] += 1
                continue

            failure_code = validate_stored_object(item, head)
            if failure_code:
                if _fail_pending(table, item, bucket_name, now, failure_code):
                    result["failed"] += 1
                continue

            enqueue_photo_processing(bucket_name, s3_key)
            result["requeued"] += 1
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                continue
            result["errors"] += 1
            print(f"Photo reconciliation error: {type(exc).__name__}")
        except Exception as exc:
            result["errors"] += 1
            print(f"Photo reconciliation error: {type(exc).__name__}")

    print(
        "Photo reconciliation completed: "
        f"requeued={result['requeued']}, failed={result['failed']}, "
        f"purged={result['purged']}, errors={result['errors']}"
    )
    if result["errors"]:
        raise RuntimeError(f"Photo reconciliation incomplete: {result['errors']} errors")
    return result

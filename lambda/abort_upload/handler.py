import json
import os
import sys
import time
from datetime import datetime, timezone

from botocore.exceptions import ClientError

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from shared.api_utils import json_response
from photo_shared.aws_clients import dynamodb, s3
from shared.jwt_helper import verify_token
from photo_shared.photo_queue import enqueue_photo_processing


def _bucket_name():
    if os.getenv("ENV", "local") == "local":
        return os.getenv("S3_BUCKET", "wedding-photos-local")
    return os.getenv("S3_BUCKET", "wedding-photos-prod")


def _object_exists(bucket_name: str, key: str) -> bool:
    try:
        s3.head_object(Bucket=bucket_name, Key=key)
        return True
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") in {
            "404", "NoSuchKey", "NotFound"
        }:
            return False
        raise


def _mark_failed(table, item: dict, now: int):
    try:
        table.update_item(
            Key={"PK": item["PK"]},
            UpdateExpression=(
                "SET uploadStatus = :cleaning, processingStatus = :failed, "
                "cleanupStartedAt = :now, cleanupAfter = :now, "
                "processingUpdatedAt = :updated"
            ),
            ConditionExpression="uploadStatus = :pending",
            ExpressionAttributeValues={
                ":pending": "pending",
                ":cleaning": "cleaning",
                ":failed": "failed",
                ":now": now,
                ":updated": datetime.now(timezone.utc).isoformat(),
            },
        )
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
            raise
        return False

    thumb_key = item.get("thumbKey")
    if thumb_key:
        s3.delete_object(Bucket=_bucket_name(), Key=thumb_key)
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
            ":code": "UPLOAD_NOT_RECEIVED",
            ":updated": datetime.now(timezone.utc).isoformat(),
        },
    )
    return True


def handler(event, context):
    """Annulla solo un pending il cui PUT S3 e' certamente assente."""
    try:
        headers = event.get("headers", {})
        auth_header = headers.get("authorization", headers.get("Authorization", ""))
        if not auth_header.startswith("Bearer "):
            return json_response(401, {"error": "Non autorizzato"})

        payload = verify_token(auth_header.split(" ", 1)[1])
        if not payload:
            return json_response(401, {"error": "Token invalido o scaduto"})

        body = json.loads(event.get("body") or "{}")
        photo_id = body.get("photoId")
        if not isinstance(photo_id, str) or not photo_id.startswith("PHOTO#"):
            return json_response(400, {"error": "Identificatore media non valido"})

        table = dynamodb.Table("WeddingPhotos")
        item = table.get_item(Key={"PK": photo_id}, ConsistentRead=True).get("Item")
        if not item:
            return json_response(200, {"photoId": photo_id, "status": "already-absent"})

        requester_id = str(payload.get("phone") or "")
        if not payload.get("isAdmin", False) and str(item.get("uploadedBy") or "") != requester_id:
            return json_response(403, {"error": "Accesso non autorizzato"})

        status = item.get("uploadStatus")
        if status == "completed":
            return json_response(200, {"photoId": photo_id, "status": "already-completed"})
        if status in {"cleaning", "failed"}:
            return json_response(200, {"photoId": photo_id, "status": status})
        if status != "pending":
            return json_response(409, {"error": "Sessione di upload non annullabile"})

        bucket_name = _bucket_name()
        s3_key = item.get("s3Key")
        if s3_key and _object_exists(bucket_name, s3_key):
            enqueue_photo_processing(bucket_name, s3_key)
            return json_response(200, {"photoId": photo_id, "status": "processing"})

        now = int(time.time())
        changed = _mark_failed(table, item, now)
        return json_response(200, {
            "photoId": photo_id,
            "status": "failed" if changed else "state-changed",
        })
    except (json.JSONDecodeError, TypeError, ValueError):
        return json_response(400, {"error": "Richiesta non valida"})
    except Exception as exc:
        print(f"Abort upload error: {type(exc).__name__}")
        return json_response(500, {"error": "Errore durante la pulizia dell'upload"})

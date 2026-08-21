import io
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from urllib.parse import unquote_plus

from botocore.exceptions import ClientError

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from photo_shared.aws_clients import dynamodb, s3
from photo_shared.media_utils import infer_media_type, validate_stored_object

try:
    from PIL import Image, ImageOps, UnidentifiedImageError
except Exception as exc:  # pragma: no cover - errore di packaging, ritentato via SQS
    print(f"Photo processor dependency error: {type(exc).__name__}")
    Image = None
    ImageOps = None
    UnidentifiedImageError = OSError

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except Exception as exc:  # pragma: no cover - errore di packaging, ritentato via SQS
    print(f"HEIF processor dependency error: {type(exc).__name__}")


UUID_FILENAME_RE = re.compile(
    r"^(?P<photo_id>[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-"
    r"[89ab][0-9a-f]{3}-[0-9a-f]{12})\.[a-z0-9]+$",
    re.IGNORECASE,
)


def _bucket_name():
    if os.getenv("ENV", "local") == "local":
        return os.getenv("S3_BUCKET", "wedding-photos-local")
    return os.getenv("S3_BUCKET", "wedding-photos-prod")


def _technical_reference(photo_id: str) -> str:
    return photo_id[-8:] if photo_id else "unknown"


def _conditional_failed(exc: ClientError) -> bool:
    return exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException"


def _delete_object(bucket_name: str, key: str):
    try:
        s3.delete_object(Bucket=bucket_name, Key=key)
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") not in {
            "404", "NoSuchKey", "NotFound"
        }:
            raise


def _photo_id_from_key(s3_key: str) -> str | None:
    if not s3_key.startswith("uploads/"):
        return None
    filename = s3_key.rsplit("/", 1)[-1]
    match = UUID_FILENAME_RE.fullmatch(filename)
    return match.group("photo_id").lower() if match else None


def _iter_s3_records(event: dict):
    """Estrae eventi S3 incapsulati in SQS; accetta S3 diretto solo nei test."""
    for outer_record in event.get("Records", []):
        receive_count = int(
            outer_record.get("attributes", {}).get("ApproximateReceiveCount", "1")
        )
        if "body" in outer_record:
            payload = json.loads(outer_record.get("body") or "{}")
            if payload.get("Event") == "s3:TestEvent":
                continue
            for s3_record in payload.get("Records", []):
                if s3_record.get("eventSource") in (None, "aws:s3") and "s3" in s3_record:
                    yield s3_record, receive_count
        elif "s3" in outer_record:
            yield outer_record, receive_count


def _mark_invalid(table, item: dict, bucket_name: str, s3_key: str, failure_code: str):
    _delete_object(bucket_name, s3_key)
    thumb_key = item.get("thumbKey")
    if thumb_key:
        _delete_object(bucket_name, thumb_key)
    now = int(time.time())
    try:
        table.update_item(
            Key={"PK": item["PK"]},
            UpdateExpression=(
                "SET uploadStatus = :failed, processingStatus = :failed, "
                "failedAt = :now, failureCode = :code, processingUpdatedAt = :updated "
                "REMOVE s3Key, thumbKey"
            ),
            ConditionExpression=(
                "attribute_exists(PK) AND attribute_not_exists(deletedAt) AND "
                "uploadStatus IN (:pending, :completed) AND "
                "processingStatus <> :processing_completed"
            ),
            ExpressionAttributeValues={
                ":pending": "pending",
                ":completed": "completed",
                ":failed": "failed",
                ":processing_completed": "completed",
                ":now": now,
                ":updated": datetime.now(timezone.utc).isoformat(),
                ":code": failure_code,
            },
        )
    except ClientError as exc:
        if not _conditional_failed(exc):
            raise


def _mark_original_completed(table, item: dict, receive_count: int):
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        table.update_item(
            Key={"PK": item["PK"]},
            UpdateExpression=(
                "SET uploadStatus = :completed, uploadCompletedAt = :now, "
                "processingStatus = :processing_pending, processingUpdatedAt = :now, "
                "processingAttempts = :attempts"
            ),
            ConditionExpression=(
                "attribute_exists(PK) AND attribute_not_exists(deletedAt) AND "
                "uploadStatus IN (:pending, :completed) AND "
                "processingStatus = :processing_pending"
            ),
            ExpressionAttributeValues={
                ":pending": "pending",
                ":completed": "completed",
                ":processing_pending": "pending",
                ":now": now_iso,
                ":attempts": receive_count,
            },
        )
    except ClientError as exc:
        if not _conditional_failed(exc):
            raise


def _mark_video_completed(table, item: dict, receive_count: int):
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        table.update_item(
            Key={"PK": item["PK"]},
            UpdateExpression=(
                "SET uploadStatus = :completed, uploadCompletedAt = :now, "
                "processingStatus = :not_required, processingUpdatedAt = :now, "
                "processingAttempts = :attempts"
            ),
            ConditionExpression=(
                "attribute_exists(PK) AND attribute_not_exists(deletedAt) AND "
                "uploadStatus IN (:pending, :completed) AND "
                "processingStatus = :processing_pending"
            ),
            ExpressionAttributeValues={
                ":pending": "pending",
                ":completed": "completed",
                ":processing_pending": "pending",
                ":not_required": "not_required",
                ":now": now_iso,
                ":attempts": receive_count,
            },
        )
    except ClientError as exc:
        if not _conditional_failed(exc):
            raise


def _thumbnail_bytes(bucket_name: str, s3_key: str):
    if Image is None or ImageOps is None:
        raise RuntimeError("Pillow unavailable")
    response = s3.get_object(Bucket=bucket_name, Key=s3_key)
    raw = response["Body"].read()
    try:
        image = Image.open(io.BytesIO(raw))
        image = ImageOps.exif_transpose(image)
        image.thumbnail((300, 300))
        extension = s3_key.rsplit(".", 1)[-1].lower()
        image_format = "JPEG" if extension in {"jpg", "jpeg", "heic", "heif"} else extension.upper()
        if image_format == "JPEG" and image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        output = io.BytesIO()
        save_options = {"quality": 85, "optimize": True} if image_format == "JPEG" else {}
        image.save(output, format=image_format, **save_options)
        output.seek(0)
        return output, image_format
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError("invalid image") from exc


def _mark_thumbnail_completed(table, item: dict, thumb_key: str, receive_count: int):
    try:
        table.update_item(
            Key={"PK": item["PK"]},
            UpdateExpression=(
                "SET thumbKey = :thumb, approved = :approved, "
                "processingStatus = :completed, processingUpdatedAt = :now, "
                "processingAttempts = :attempts REMOVE failureCode, failedAt"
            ),
            ConditionExpression=(
                "attribute_exists(PK) AND attribute_not_exists(deletedAt) AND "
                "uploadStatus = :completed AND processingStatus = :pending"
            ),
            ExpressionAttributeValues={
                ":thumb": thumb_key,
                ":approved": True,
                ":completed": "completed",
                ":pending": "pending",
                ":now": datetime.now(timezone.utc).isoformat(),
                ":attempts": receive_count,
            },
        )
        return True
    except ClientError as exc:
        if _conditional_failed(exc):
            return False
        raise


def _mark_thumbnail_retry(table, item: dict, receive_count: int, final_attempt: bool):
    values = {
        ":completed": "completed",
        ":pending": "pending",
        ":attempts": receive_count,
        ":updated": datetime.now(timezone.utc).isoformat(),
    }
    update = "SET processingAttempts = :attempts, processingUpdatedAt = :updated"
    if final_attempt:
        update += ", processingStatus = :failed, failedAt = :failed_at, failureCode = :code"
        values.update({
            ":failed": "failed",
            ":failed_at": int(time.time()),
            ":code": "THUMBNAIL_PROCESSING_FAILED",
        })
    try:
        table.update_item(
            Key={"PK": item["PK"]},
            UpdateExpression=update,
            ConditionExpression="uploadStatus = :completed AND processingStatus = :pending",
            ExpressionAttributeValues=values,
        )
    except ClientError as exc:
        if not _conditional_failed(exc):
            raise


def _process_s3_record(record: dict, receive_count: int):
    bucket_name = record.get("s3", {}).get("bucket", {}).get("name", "")
    encoded_key = record.get("s3", {}).get("object", {}).get("key", "")
    s3_key = unquote_plus(encoded_key)
    photo_id = _photo_id_from_key(s3_key)
    if bucket_name != _bucket_name() or not photo_id:
        print("Ignored unexpected photo event")
        return

    table = dynamodb.Table("WeddingPhotos")
    pk = f"PHOTO#{photo_id}"
    item = table.get_item(Key={"PK": pk}, ConsistentRead=True).get("Item")
    if not item:
        _delete_object(bucket_name, s3_key)
        print(f"Removed orphan media {_technical_reference(photo_id)}")
        return

    upload_status = item.get("uploadStatus")
    processing_status = item.get("processingStatus")
    if item.get("deletedAt") or upload_status in {"cleaning", "failed"}:
        _delete_object(bucket_name, s3_key)
        print(f"Removed late media {_technical_reference(photo_id)}")
        return
    if item.get("s3Key") != s3_key:
        _delete_object(bucket_name, s3_key)
        print(f"Removed mismatched media {_technical_reference(photo_id)}")
        return
    if upload_status == "completed" and processing_status in {
        "completed", "not_required", "failed"
    }:
        print(f"Duplicate media event {_technical_reference(photo_id)}")
        return
    if upload_status not in {"pending", "completed"} or processing_status != "pending":
        print(f"Ignored stale media event {_technical_reference(photo_id)}")
        return

    try:
        head = s3.head_object(Bucket=bucket_name, Key=s3_key)
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") not in {
            "404", "NoSuchKey", "NotFound"
        }:
            raise
        max_attempts = int(os.getenv("SQS_MAX_RECEIVE_COUNT", "5"))
        if receive_count >= max_attempts:
            _mark_invalid(table, item, bucket_name, s3_key, "UPLOAD_NOT_RECEIVED")
        raise RuntimeError("uploaded object not available") from exc

    failure_code = validate_stored_object(item, head)
    if failure_code:
        _mark_invalid(table, item, bucket_name, s3_key, failure_code)
        print(f"Rejected invalid media {_technical_reference(photo_id)}")
        return

    media_type = infer_media_type(item)
    if media_type == "video":
        _mark_video_completed(table, item, receive_count)
        print(f"Completed video {_technical_reference(photo_id)}")
        return

    _mark_original_completed(table, item, receive_count)
    try:
        thumbnail, image_format = _thumbnail_bytes(bucket_name, s3_key)
    except ValueError:
        _mark_invalid(table, item, bucket_name, s3_key, "INVALID_IMAGE")
        print(f"Rejected invalid image {_technical_reference(photo_id)}")
        return
    except Exception:
        max_attempts = int(os.getenv("SQS_MAX_RECEIVE_COUNT", "5"))
        _mark_thumbnail_retry(table, item, receive_count, receive_count >= max_attempts)
        raise

    extension = "jpg" if image_format == "JPEG" else image_format.lower()
    thumb_key = f"thumbnails/{s3_key.split('/', 2)[1]}/{photo_id}.{extension}"
    try:
        s3.put_object(
            Bucket=bucket_name,
            Key=thumb_key,
            Body=thumbnail,
            ContentType=f"image/{'jpeg' if image_format == 'JPEG' else image_format.lower()}",
        )
        if not _mark_thumbnail_completed(table, item, thumb_key, receive_count):
            _delete_object(bucket_name, thumb_key)
            print(f"Removed stale thumbnail {_technical_reference(photo_id)}")
            return
    except Exception:
        max_attempts = int(os.getenv("SQS_MAX_RECEIVE_COUNT", "5"))
        _mark_thumbnail_retry(table, item, receive_count, receive_count >= max_attempts)
        raise

    print(f"Completed image {_technical_reference(photo_id)}")


def handler(event, context):
    """Elabora messaggi SQS contenenti eventi S3 ObjectCreated, con batch size 1."""
    for s3_record, receive_count in _iter_s3_records(event):
        _process_s3_record(s3_record, receive_count)

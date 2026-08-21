import io
import json
import os
from urllib.parse import quote_plus

import boto3
import pytest
from botocore.exceptions import ClientError
from moto import mock_aws
from PIL import Image

os.environ["ENV"] = "test"
os.environ["S3_BUCKET"] = "test-media-bucket"
os.environ["SQS_MAX_RECEIVE_COUNT"] = "5"

from process_photo import handler as handler_module
from photo_shared.media_utils import MAX_IMAGE_SIZE_BYTES


PHOTO_ID = "65d4ac10-1234-4abc-8def-123456789c92"
PHOTO_KEY = f"uploads/mario-rossi/{PHOTO_ID}.jpg"
VIDEO_ID = "75d4ac10-1234-4abc-8def-123456789c93"
VIDEO_KEY = f"uploads/mario-rossi/{VIDEO_ID}.mp4"


@pytest.fixture
def aws_mock():
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="eu-west-1")
        table = dynamodb.create_table(
            TableName="WeddingPhotos",
            KeySchema=[{"AttributeName": "PK", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "PK", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        s3 = boto3.client("s3", region_name="eu-west-1")
        s3.create_bucket(
            Bucket="test-media-bucket",
            CreateBucketConfiguration={"LocationConstraint": "eu-west-1"},
        )
        yield table, s3


def _image_bytes(color="red"):
    output = io.BytesIO()
    Image.new("RGB", (20, 10), color=color).save(output, format="JPEG")
    return output.getvalue()


def _put_record(table, *, photo_id=PHOTO_ID, key=PHOTO_KEY, media_type="image", content_type="image/jpeg", **extra):
    item = {
        "PK": f"PHOTO#{photo_id}",
        "uploadedBy": "guest-test",
        "uploaderName": "Mario Rossi",
        "uploadedAt": "2026-08-21T10:00:00+00:00",
        "s3Key": key,
        "mediaType": media_type,
        "contentType": content_type,
        "uploadStatus": "pending",
        "processingStatus": "pending",
        "processingAttempts": 0,
    }
    item.update(extra)
    table.put_item(Item=item)
    return item


def _event(key=PHOTO_KEY, receive_count=1):
    s3_event = {
        "Records": [{
            "eventSource": "aws:s3",
            "s3": {
                "bucket": {"name": "test-media-bucket"},
                "object": {"key": quote_plus(key)},
            },
        }]
    }
    return {
        "Records": [{
            "body": json.dumps(s3_event),
            "attributes": {"ApproximateReceiveCount": str(receive_count)},
        }]
    }


def _patch_clients(monkeypatch, table, s3):
    class Dynamo:
        def Table(self, name):
            assert name == "WeddingPhotos"
            return table

    monkeypatch.setattr(handler_module, "dynamodb", Dynamo())
    monkeypatch.setattr(handler_module, "s3", s3)


def test_sqs_photo_event_completes_original_and_thumbnail(aws_mock, monkeypatch):
    table, s3 = aws_mock
    _put_record(table)
    s3.put_object(Bucket="test-media-bucket", Key=PHOTO_KEY, Body=_image_bytes(), ContentType="image/jpeg")
    _patch_clients(monkeypatch, table, s3)

    handler_module.handler(_event(), {})

    item = table.get_item(Key={"PK": f"PHOTO#{PHOTO_ID}"}, ConsistentRead=True)["Item"]
    assert item["uploadStatus"] == "completed"
    assert item["processingStatus"] == "completed"
    assert item["thumbKey"] == f"thumbnails/mario-rossi/{PHOTO_ID}.jpg"
    assert s3.head_object(Bucket="test-media-bucket", Key=item["thumbKey"])["ContentType"] == "image/jpeg"


def test_sqs_video_event_needs_no_thumbnail(aws_mock, monkeypatch):
    table, s3 = aws_mock
    _put_record(table, photo_id=VIDEO_ID, key=VIDEO_KEY, media_type="video", content_type="video/mp4")
    s3.put_object(Bucket="test-media-bucket", Key=VIDEO_KEY, Body=b"video", ContentType="video/mp4")
    _patch_clients(monkeypatch, table, s3)

    handler_module.handler(_event(VIDEO_KEY), {})

    item = table.get_item(Key={"PK": f"PHOTO#{VIDEO_ID}"})["Item"]
    assert item["uploadStatus"] == "completed"
    assert item["processingStatus"] == "not_required"
    assert "thumbKey" not in item


def test_duplicate_and_url_encoded_events_are_idempotent(aws_mock, monkeypatch):
    table, s3 = aws_mock
    _put_record(table)
    s3.put_object(Bucket="test-media-bucket", Key=PHOTO_KEY, Body=_image_bytes(), ContentType="image/jpeg")
    _patch_clients(monkeypatch, table, s3)

    handler_module.handler(_event(), {})
    handler_module.handler(_event(), {})

    item = table.get_item(Key={"PK": f"PHOTO#{PHOTO_ID}"})["Item"]
    assert item["processingStatus"] == "completed"
    assert item["processingAttempts"] == 1


def test_s3_test_event_is_ignored(monkeypatch):
    class FailDynamo:
        def Table(self, _name):
            raise AssertionError("DynamoDB non deve essere chiamato")

    monkeypatch.setattr(handler_module, "dynamodb", FailDynamo())
    event = {"Records": [{"body": json.dumps({"Event": "s3:TestEvent"}), "attributes": {}}]}
    assert handler_module.handler(event, {}) is None


def test_orphan_object_is_removed(aws_mock, monkeypatch):
    table, s3 = aws_mock
    s3.put_object(Bucket="test-media-bucket", Key=PHOTO_KEY, Body=b"orphan", ContentType="image/jpeg")
    _patch_clients(monkeypatch, table, s3)

    handler_module.handler(_event(), {})

    assert s3.list_objects_v2(Bucket="test-media-bucket")["KeyCount"] == 0


def test_missing_object_is_retried_without_failing_record_early(aws_mock, monkeypatch):
    table, s3 = aws_mock
    _put_record(table)
    _patch_clients(monkeypatch, table, s3)

    with pytest.raises(RuntimeError, match="not available"):
        handler_module.handler(_event(receive_count=1), {})

    item = table.get_item(Key={"PK": f"PHOTO#{PHOTO_ID}"})["Item"]
    assert item["uploadStatus"] == "pending"
    assert item["processingStatus"] == "pending"


def test_last_missing_object_attempt_marks_failed_before_dlq(aws_mock, monkeypatch):
    table, s3 = aws_mock
    _put_record(table)
    _patch_clients(monkeypatch, table, s3)

    with pytest.raises(RuntimeError, match="not available"):
        handler_module.handler(_event(receive_count=5), {})

    item = table.get_item(Key={"PK": f"PHOTO#{PHOTO_ID}"})["Item"]
    assert item["uploadStatus"] == "failed"
    assert item["failureCode"] == "UPLOAD_NOT_RECEIVED"


def test_oversized_object_is_deleted(aws_mock, monkeypatch):
    table, real_s3 = aws_mock
    _put_record(table)
    real_s3.put_object(
        Bucket="test-media-bucket",
        Key=PHOTO_KEY,
        Body=b"small-test-body",
        ContentType="image/jpeg",
    )

    class OversizedHeadS3:
        def __getattr__(self, name):
            return getattr(real_s3, name)

        def head_object(self, **kwargs):
            head = real_s3.head_object(**kwargs)
            head["ContentLength"] = MAX_IMAGE_SIZE_BYTES + 1
            return head

    _patch_clients(monkeypatch, table, OversizedHeadS3())

    handler_module.handler(_event(), {})

    item = table.get_item(Key={"PK": f"PHOTO#{PHOTO_ID}"})["Item"]
    assert item["failureCode"] == "FILE_TOO_LARGE"
    assert real_s3.list_objects_v2(Bucket="test-media-bucket")["KeyCount"] == 0


def test_late_object_for_cleaning_record_is_deleted(aws_mock, monkeypatch):
    table, s3 = aws_mock
    _put_record(
        table,
        uploadStatus="cleaning",
        processingStatus="failed",
    )
    s3.put_object(Bucket="test-media-bucket", Key=PHOTO_KEY, Body=b"late", ContentType="image/jpeg")
    _patch_clients(monkeypatch, table, s3)

    handler_module.handler(_event(), {})

    assert s3.list_objects_v2(Bucket="test-media-bucket")["KeyCount"] == 0


@pytest.mark.parametrize(
    ("content_type", "body", "failure_code"),
    [
        ("image/png", _image_bytes(), "INVALID_CONTENT_TYPE"),
        ("image/jpeg", b"not-an-image", "INVALID_IMAGE"),
    ],
)
def test_invalid_media_is_deleted_and_failed(aws_mock, monkeypatch, content_type, body, failure_code):
    table, s3 = aws_mock
    _put_record(table)
    s3.put_object(Bucket="test-media-bucket", Key=PHOTO_KEY, Body=body, ContentType=content_type)
    _patch_clients(monkeypatch, table, s3)

    handler_module.handler(_event(), {})

    item = table.get_item(Key={"PK": f"PHOTO#{PHOTO_ID}"})["Item"]
    assert item["uploadStatus"] == "failed"
    assert item["processingStatus"] == "failed"
    assert item["failureCode"] == failure_code
    assert "s3Key" not in item
    assert s3.list_objects_v2(Bucket="test-media-bucket")["KeyCount"] == 0


def test_thumbnail_failure_retries_and_final_attempt_marks_failed(aws_mock, monkeypatch):
    table, real_s3 = aws_mock
    _put_record(table)
    real_s3.put_object(Bucket="test-media-bucket", Key=PHOTO_KEY, Body=_image_bytes(), ContentType="image/jpeg")

    class FailingThumbnailS3:
        def __getattr__(self, name):
            return getattr(real_s3, name)

        def put_object(self, **kwargs):
            if kwargs["Key"].startswith("thumbnails/"):
                raise ClientError({"Error": {"Code": "ServiceUnavailable"}}, "PutObject")
            return real_s3.put_object(**kwargs)

    _patch_clients(monkeypatch, table, FailingThumbnailS3())

    with pytest.raises(ClientError):
        handler_module.handler(_event(receive_count=1), {})
    retry_item = table.get_item(Key={"PK": f"PHOTO#{PHOTO_ID}"})["Item"]
    assert retry_item["uploadStatus"] == "completed"
    assert retry_item["processingStatus"] == "pending"
    assert real_s3.head_object(Bucket="test-media-bucket", Key=PHOTO_KEY)

    with pytest.raises(ClientError):
        handler_module.handler(_event(receive_count=5), {})
    failed_item = table.get_item(Key={"PK": f"PHOTO#{PHOTO_ID}"})["Item"]
    assert failed_item["uploadStatus"] == "completed"
    assert failed_item["processingStatus"] == "failed"
    assert failed_item["failureCode"] == "THUMBNAIL_PROCESSING_FAILED"
    assert real_s3.head_object(Bucket="test-media-bucket", Key=PHOTO_KEY)


def test_full_uuid_is_required_in_key():
    assert handler_module._photo_id_from_key(PHOTO_KEY) == PHOTO_ID
    assert handler_module._photo_id_from_key("uploads/mario-rossi/65d4ac10.jpg") is None

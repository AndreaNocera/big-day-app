import os
import time

import boto3
import pytest
from moto import mock_aws

os.environ["ENV"] = "test"
os.environ["S3_BUCKET"] = "test-media-bucket"
os.environ["UPLOAD_FAILED_AUDIT_RETENTION_SECONDS"] = "172800"

from cleanup_pending_uploads import handler as handler_module


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
        yield dynamodb, table, s3


def _pending(pk, key, cleanup_after, **extra):
    item = {
        "PK": pk,
        "uploadedBy": "guest-test",
        "uploadedAt": "2026-08-21T10:00:00+00:00",
        "s3Key": key,
        "contentType": "image/jpeg",
        "mediaType": "image",
        "uploadStatus": "pending",
        "processingStatus": "pending",
        "cleanupAfter": cleanup_after,
    }
    item.update(extra)
    return item


def _patch(monkeypatch, dynamodb, s3, queued):
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb)
    monkeypatch.setattr(handler_module, "s3", s3)
    monkeypatch.setattr(
        handler_module,
        "enqueue_photo_processing",
        lambda bucket, key: queued.append((bucket, key)),
    )


def test_cleanup_leaves_pending_before_cleanup_after(aws_mock, monkeypatch):
    dynamodb, table, s3 = aws_mock
    item = _pending("PHOTO#future", "uploads/test/future.jpg", int(time.time()) + 3600)
    table.put_item(Item=item)
    _patch(monkeypatch, dynamodb, s3, [])

    result = handler_module.handler({}, {})

    assert result == {"requeued": 0, "failed": 0, "purged": 0, "errors": 0}
    assert table.get_item(Key={"PK": item["PK"]})["Item"]


def test_cleanup_expired_missing_object_becomes_failed_audit(aws_mock, monkeypatch):
    dynamodb, table, s3 = aws_mock
    item = _pending("PHOTO#expired", "uploads/test/expired.jpg", int(time.time()) - 1)
    table.put_item(Item=item)
    _patch(monkeypatch, dynamodb, s3, [])

    result = handler_module.handler({}, {})

    failed = table.get_item(Key={"PK": item["PK"]})["Item"]
    assert result["failed"] == 1
    assert failed["uploadStatus"] == "failed"
    assert failed["failureCode"] == "UPLOAD_NOT_RECEIVED"
    assert "s3Key" not in failed


def test_cleanup_requeues_present_valid_object(aws_mock, monkeypatch):
    dynamodb, table, s3 = aws_mock
    item = _pending("PHOTO#present", "uploads/test/present.jpg", int(time.time()) - 1)
    table.put_item(Item=item)
    s3.put_object(
        Bucket="test-media-bucket",
        Key=item["s3Key"],
        Body=b"image-placeholder",
        ContentType="image/jpeg",
    )
    queued = []
    _patch(monkeypatch, dynamodb, s3, queued)

    result = handler_module.handler({}, {})

    assert result["requeued"] == 1
    assert queued == [("test-media-bucket", item["s3Key"])]
    assert table.get_item(Key={"PK": item["PK"]})["Item"]["uploadStatus"] == "pending"


def test_cleanup_invalid_object_is_deleted_and_failed(aws_mock, monkeypatch):
    dynamodb, table, s3 = aws_mock
    item = _pending("PHOTO#invalid", "uploads/test/invalid.jpg", int(time.time()) - 1)
    table.put_item(Item=item)
    s3.put_object(
        Bucket="test-media-bucket",
        Key=item["s3Key"],
        Body=b"wrong",
        ContentType="video/mp4",
    )
    _patch(monkeypatch, dynamodb, s3, [])

    result = handler_module.handler({}, {})

    failed = table.get_item(Key={"PK": item["PK"]})["Item"]
    assert result["failed"] == 1
    assert failed["failureCode"] == "INVALID_CONTENT_TYPE"
    assert s3.list_objects_v2(Bucket="test-media-bucket")["KeyCount"] == 0


def test_failed_audit_is_retained_then_purged(aws_mock, monkeypatch):
    dynamodb, table, s3 = aws_mock
    now = int(time.time())
    recent = {
        "PK": "PHOTO#recent-failed",
        "uploadStatus": "failed",
        "processingStatus": "failed",
        "failedAt": now - 60,
    }
    old = {
        "PK": "PHOTO#old-failed",
        "uploadStatus": "failed",
        "processingStatus": "failed",
        "failedAt": now - 172801,
    }
    table.put_item(Item=recent)
    table.put_item(Item=old)
    _patch(monkeypatch, dynamodb, s3, [])

    result = handler_module.handler({}, {})

    assert result["purged"] == 1
    assert table.get_item(Key={"PK": recent["PK"]}).get("Item")
    assert table.get_item(Key={"PK": old["PK"]}).get("Item") is None

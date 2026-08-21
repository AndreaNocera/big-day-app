import json
import os

import boto3
import pytest
from moto import mock_aws

os.environ["ENV"] = "test"
os.environ["JWT_SECRET"] = "test-secret-at-least-32-bytes-long"
os.environ["S3_BUCKET"] = "test-media-bucket"

from abort_upload import handler as handler_module
import shared.jwt_helper as jwt_helper


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


def _event(photo_id="PHOTO#pending", phone="guest-test"):
    token = jwt_helper.generate_token(phone, "Test Guest")
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({"photoId": photo_id}),
    }


def _pending_record():
    return {
        "PK": "PHOTO#pending",
        "uploadedBy": "guest-test",
        "s3Key": "uploads/test/pending.jpg",
        "uploadStatus": "pending",
        "processingStatus": "pending",
    }


def test_abort_without_object_transitions_pending_to_failed_audit(aws_mock, monkeypatch):
    dynamodb, table, s3 = aws_mock
    table.put_item(Item=_pending_record())
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb)
    monkeypatch.setattr(handler_module, "s3", s3)

    response = handler_module.handler(_event(), {})

    assert response["statusCode"] == 200
    item = table.get_item(Key={"PK": "PHOTO#pending"})["Item"]
    assert item["uploadStatus"] == "failed"
    assert item["processingStatus"] == "failed"
    assert item["failureCode"] == "UPLOAD_NOT_RECEIVED"
    assert "s3Key" not in item


def test_abort_with_object_keeps_pending_and_requeues(aws_mock, monkeypatch):
    dynamodb, table, s3 = aws_mock
    item = _pending_record()
    table.put_item(Item=item)
    s3.put_object(Bucket="test-media-bucket", Key=item["s3Key"], Body=b"media")
    queued = []
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb)
    monkeypatch.setattr(handler_module, "s3", s3)
    monkeypatch.setattr(
        handler_module,
        "enqueue_photo_processing",
        lambda bucket, key: queued.append((bucket, key)),
    )

    response = handler_module.handler(_event(), {})

    assert response["statusCode"] == 200
    assert json.loads(response["body"])["status"] == "processing"
    assert table.get_item(Key={"PK": "PHOTO#pending"})["Item"]["uploadStatus"] == "pending"
    assert queued == [("test-media-bucket", item["s3Key"])]
    assert s3.head_object(Bucket="test-media-bucket", Key=item["s3Key"])


def test_abort_never_moves_completed_record_to_cleaning(aws_mock, monkeypatch):
    dynamodb, table, s3 = aws_mock
    item = _pending_record() | {
        "uploadStatus": "completed",
        "processingStatus": "completed",
    }
    table.put_item(Item=item)
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb)
    monkeypatch.setattr(handler_module, "s3", s3)

    response = handler_module.handler(_event(), {})

    assert response["statusCode"] == 200
    assert json.loads(response["body"])["status"] == "already-completed"
    assert table.get_item(Key={"PK": "PHOTO#pending"})["Item"]["uploadStatus"] == "completed"


def test_abort_is_idempotent_when_record_is_missing(aws_mock, monkeypatch):
    dynamodb, _table, s3 = aws_mock
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb)
    monkeypatch.setattr(handler_module, "s3", s3)
    response = handler_module.handler(_event(photo_id="PHOTO#missing"), {})
    assert response["statusCode"] == 200
    assert json.loads(response["body"])["status"] == "already-absent"


def test_abort_enforces_ownership(aws_mock, monkeypatch):
    dynamodb, table, s3 = aws_mock
    table.put_item(Item=_pending_record())
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb)
    monkeypatch.setattr(handler_module, "s3", s3)
    response = handler_module.handler(_event(phone="another-guest"), {})
    assert response["statusCode"] == 403

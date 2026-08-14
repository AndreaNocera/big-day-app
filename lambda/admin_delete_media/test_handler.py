import json
import os

import boto3
import pytest
from moto import mock_aws

os.environ["ENV"] = "test"
os.environ["JWT_SECRET"] = "test-secret-at-least-32-bytes-long"
os.environ["S3_BUCKET"] = "test-media-bucket"

from admin_delete_media import handler as handler_module
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


def _admin_event(photo_ids, mode):
    token = jwt_helper.generate_token("admin-test", "Test Admin", is_admin=True)
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({"photoIds": photo_ids, "mode": mode}),
    }


def _guest_event(photo_ids, mode="physical", phone="guest-test", is_photo_guest=False):
    token = jwt_helper.generate_token(
        phone,
        "Test Guest",
        is_admin=False,
        is_photo_guest=is_photo_guest,
    )
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({"photoIds": photo_ids, "mode": mode}),
    }


def test_logical_delete_hides_record_but_preserves_assets(aws_mock, monkeypatch):
    dynamodb, table, s3 = aws_mock
    table.put_item(Item={
        "PK": "PHOTO#logical",
        "s3Key": "uploads/logical.jpg",
        "thumbKey": "thumbnails/logical.jpg",
    })
    s3.put_object(Bucket="test-media-bucket", Key="uploads/logical.jpg", Body=b"original")
    s3.put_object(Bucket="test-media-bucket", Key="thumbnails/logical.jpg", Body=b"thumbnail")
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb)
    monkeypatch.setattr(handler_module, "s3", s3)

    response = handler_module.handler(_admin_event(["PHOTO#logical"], "logical"), {})

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["deletedCount"] == 1
    assert body["deletedS3Objects"] == 0
    item = table.get_item(Key={"PK": "PHOTO#logical"})["Item"]
    assert item["deletionMode"] == "logical"
    assert item["deletedAt"]
    assert s3.get_object(Bucket="test-media-bucket", Key="uploads/logical.jpg")["Body"].read() == b"original"


def test_physical_delete_removes_bulk_records_and_s3_assets(aws_mock, monkeypatch):
    dynamodb, table, s3 = aws_mock
    items = [
        {
            "PK": "PHOTO#image",
            "s3Key": "uploads/image.heic",
            "thumbKey": "thumbnails/image.jpg",
        },
        {
            "PK": "PHOTO#video",
            "s3Key": "uploads/video.mp4",
            "mediaType": "video",
        },
    ]
    for item in items:
        table.put_item(Item=item)
    for key in ("uploads/image.heic", "thumbnails/image.jpg", "uploads/video.mp4"):
        s3.put_object(Bucket="test-media-bucket", Key=key, Body=b"media")
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb)
    monkeypatch.setattr(handler_module, "s3", s3)

    response = handler_module.handler(
        _admin_event(["PHOTO#image", "PHOTO#video", "PHOTO#missing"], "physical"),
        {},
    )

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["deletedCount"] == 2
    assert body["missingCount"] == 1
    assert body["deletedS3Objects"] == 3
    assert table.scan()["Items"] == []
    assert s3.list_objects_v2(Bucket="test-media-bucket")["KeyCount"] == 0


def test_guest_can_physically_delete_own_media(aws_mock, monkeypatch):
    dynamodb, table, s3 = aws_mock
    table.put_item(Item={
        "PK": "PHOTO#owned",
        "uploadedBy": "guest-test",
        "s3Key": "uploads/owned.jpg",
        "thumbKey": "thumbnails/owned.jpg",
    })
    s3.put_object(Bucket="test-media-bucket", Key="uploads/owned.jpg", Body=b"original")
    s3.put_object(Bucket="test-media-bucket", Key="thumbnails/owned.jpg", Body=b"thumbnail")
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb)
    monkeypatch.setattr(handler_module, "s3", s3)

    response = handler_module.handler(_guest_event(["PHOTO#owned"]), {})

    assert response["statusCode"] == 200
    assert table.get_item(Key={"PK": "PHOTO#owned"}).get("Item") is None
    assert s3.list_objects_v2(Bucket="test-media-bucket")["KeyCount"] == 0


def test_photo_guest_registered_by_name_can_delete_own_media(aws_mock, monkeypatch):
    dynamodb, table, s3 = aws_mock
    photo_guest_id = "photoguest:test-id"
    table.put_item(Item={
        "PK": "PHOTO#photo-guest-owned",
        "uploadedBy": photo_guest_id,
        "s3Key": "uploads/photo-guest-owned.jpg",
    })
    s3.put_object(
        Bucket="test-media-bucket",
        Key="uploads/photo-guest-owned.jpg",
        Body=b"original",
    )
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb)
    monkeypatch.setattr(handler_module, "s3", s3)

    response = handler_module.handler(
        _guest_event(
            ["PHOTO#photo-guest-owned"],
            phone=photo_guest_id,
            is_photo_guest=True,
        ),
        {},
    )

    assert response["statusCode"] == 200
    assert table.get_item(Key={"PK": "PHOTO#photo-guest-owned"}).get("Item") is None
    assert s3.list_objects_v2(Bucket="test-media-bucket")["KeyCount"] == 0


def test_guest_cannot_delete_another_users_media(aws_mock, monkeypatch):
    dynamodb, table, s3 = aws_mock
    table.put_item(Item={
        "PK": "PHOTO#not-owned",
        "uploadedBy": "another-guest",
        "s3Key": "uploads/not-owned.jpg",
    })
    s3.put_object(Bucket="test-media-bucket", Key="uploads/not-owned.jpg", Body=b"original")
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb)
    monkeypatch.setattr(handler_module, "s3", s3)

    response = handler_module.handler(_guest_event(["PHOTO#not-owned"]), {})

    assert response["statusCode"] == 403
    assert table.get_item(Key={"PK": "PHOTO#not-owned"}).get("Item") is not None
    assert s3.get_object(Bucket="test-media-bucket", Key="uploads/not-owned.jpg")["Body"].read() == b"original"


@pytest.mark.parametrize(
    ("photo_ids", "mode"),
    [
        (["PHOTO#one"], "logical"),
        (["PHOTO#one", "PHOTO#two"], "physical"),
    ],
)
def test_guest_cannot_use_logical_or_bulk_delete(photo_ids, mode):
    response = handler_module.handler(_guest_event(photo_ids, mode), {})

    assert response["statusCode"] == 403


def test_repeated_delete_is_idempotent(aws_mock, monkeypatch):
    dynamodb, _table, s3 = aws_mock
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb)
    monkeypatch.setattr(handler_module, "s3", s3)

    response = handler_module.handler(_admin_event(["PHOTO#already-deleted"], "physical"), {})

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["deletedCount"] == 0
    assert body["missingCount"] == 1

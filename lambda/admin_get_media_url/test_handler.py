import json
import os

import boto3
import pytest
from moto import mock_aws

os.environ["ENV"] = "test"
os.environ["JWT_SECRET"] = "test-secret-at-least-32-bytes-long"

from admin_get_media_url import handler as handler_module
import shared.jwt_helper as jwt_helper


@pytest.fixture
def aws_mock():
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="eu-west-1")
        dynamodb.create_table(
            TableName="WeddingPhotos",
            KeySchema=[{"AttributeName": "PK", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "PK", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        s3 = boto3.client("s3", region_name="eu-west-1")
        yield dynamodb, s3


@pytest.mark.parametrize(
    ("photo_id", "s3_key", "media_type", "content_type", "disposition"),
    [
        ("PHOTO#video-test", "uploads/video-test.mp4", "video", "video/mp4", "inline"),
        ("PHOTO#image-test", "uploads/image-test.heic", "image", "image/heic", "attachment"),
    ],
)
def test_admin_generates_original_url_only_on_request(
    aws_mock,
    monkeypatch,
    photo_id,
    s3_key,
    media_type,
    content_type,
    disposition,
):
    dynamodb, s3 = aws_mock
    dynamodb.Table("WeddingPhotos").put_item(Item={
        "PK": photo_id,
        "s3Key": s3_key,
        "mediaType": media_type,
        "contentType": content_type,
    })
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb)
    monkeypatch.setattr(handler_module, "s3", s3)

    token = jwt_helper.generate_token("admin-test", "Test Admin", is_admin=True)
    response = handler_module.handler({
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({
            "photoId": photo_id,
            "disposition": disposition,
        }),
    }, {})

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["expiresIn"] == 600
    assert s3_key in body["url"]


def test_non_admin_cannot_generate_media_url():
    token = jwt_helper.generate_token("guest-test", "Test Guest", is_admin=False)
    response = handler_module.handler({
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({"photoId": "PHOTO#video-test"}),
    }, {})

    assert response["statusCode"] == 403

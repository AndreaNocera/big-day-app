import json
import pytest
import boto3
import os
os.environ["ENV"] = "test"
os.environ["JWT_SECRET"] = "test-secret-at-least-32-bytes-long"

from moto import mock_aws
from get_upload_url import handler as handler_module
import shared.jwt_helper as jwt_helper

@pytest.fixture
def aws_mock():
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="eu-west-1")
        dynamodb.create_table(
            TableName="WeddingPhotos",
            KeySchema=[{"AttributeName": "PK", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "PK", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST"
        )
        
        s3 = boto3.client("s3", region_name="eu-west-1")
        s3.create_bucket(
            Bucket="wedding-photos-local",
            CreateBucketConfiguration={'LocationConstraint': 'eu-west-1'}
        )
        
        yield dynamodb, s3

def test_get_upload_url_success(aws_mock, monkeypatch):
    dynamodb_mock, s3_mock = aws_mock
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb_mock)
    monkeypatch.setattr(handler_module, "s3", s3_mock)
    
    token = jwt_helper.generate_token("+390000000001", "Test Admin", is_admin=True)
    event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({
            "filename": "foto.jpg",
            "contentType": "image/jpeg"
        })
    }
    
    response = handler_module.handler(event, {})
    assert response["statusCode"] == 200
    
    body = json.loads(response["body"])
    assert "uploadUrl" in body
    assert "key" in body
    assert "foto.jpg" not in body["key"] # uuid is used
    
    table = dynamodb_mock.Table("WeddingPhotos")
    # we need to get items since we don't know the uuid
    items = table.scan()["Items"]
    assert len(items) == 1
    assert items[0]["uploadedBy"] == "+390000000001"
    assert items[0]["s3Key"] == body["key"]
    assert items[0]["mediaType"] == "image"
    assert items[0]["contentType"] == "image/jpeg"

def test_get_video_upload_url_success(aws_mock, monkeypatch):
    dynamodb_mock, s3_mock = aws_mock
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb_mock)
    monkeypatch.setattr(handler_module, "s3", s3_mock)

    token = jwt_helper.generate_token("+390000000001", "Test Admin", is_admin=True)
    event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({
            "filename": "video.mov",
            "contentType": "video/quicktime"
        })
    }

    response = handler_module.handler(event, {})
    assert response["statusCode"] == 200

    body = json.loads(response["body"])
    assert body["key"].endswith(".mov")

    items = dynamodb_mock.Table("WeddingPhotos").scan()["Items"]
    assert len(items) == 1
    assert items[0]["mediaType"] == "video"
    assert items[0]["contentType"] == "video/quicktime"

def test_get_heic_upload_url_success(aws_mock, monkeypatch):
    dynamodb_mock, s3_mock = aws_mock
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb_mock)
    monkeypatch.setattr(handler_module, "s3", s3_mock)

    token = jwt_helper.generate_token("+390000000001", "Test Admin", is_admin=True)
    event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({
            "filename": "foto.heic",
            "contentType": "image/heic"
        })
    }

    response = handler_module.handler(event, {})
    assert response["statusCode"] == 200

    body = json.loads(response["body"])
    assert body["key"].endswith(".heic")

    items = dynamodb_mock.Table("WeddingPhotos").scan()["Items"]
    assert len(items) == 1
    assert items[0]["mediaType"] == "image"
    assert items[0]["contentType"] == "image/heic"

def test_get_upload_url_invalid_token():
    event = {
        "headers": {"Authorization": "Bearer fake"},
        "body": "{}"
    }
    response = handler_module.handler(event, {})
    assert response["statusCode"] == 401

def test_get_upload_url_rejects_unsupported_media(aws_mock, monkeypatch):
    dynamodb_mock, s3_mock = aws_mock
    monkeypatch.setattr(handler_module, "dynamodb", dynamodb_mock)
    monkeypatch.setattr(handler_module, "s3", s3_mock)

    token = jwt_helper.generate_token("+390000000001", "Test Admin", is_admin=True)
    event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({"filename": "file.avi", "contentType": "video/x-msvideo"})
    }

    response = handler_module.handler(event, {})
    assert response["statusCode"] == 400
    assert dynamodb_mock.Table("WeddingPhotos").scan()["Items"] == []

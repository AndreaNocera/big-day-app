import json
import pytest
import boto3
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ["ENV"] = "test"
os.environ["JWT_SECRET"] = "test-secret"

from moto import mock_aws
from handler import handler
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
    import handler as h
    monkeypatch.setattr(h, "dynamodb", dynamodb_mock)
    monkeypatch.setattr(h, "s3", s3_mock)
    
    token = jwt_helper.generate_token("mario@test.com", "Mario Rossi")
    event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({
            "filename": "foto.jpg",
            "contentType": "image/jpeg"
        })
    }
    
    response = handler(event, {})
    assert response["statusCode"] == 200
    
    body = json.loads(response["body"])
    assert "uploadUrl" in body
    assert "key" in body
    assert "foto.jpg" not in body["key"] # uuid is used
    
    table = dynamodb_mock.Table("WeddingPhotos")
    # we need to get items since we don't know the uuid
    items = table.scan()["Items"]
    assert len(items) == 1
    assert items[0]["uploadedBy"] == "mario@test.com"
    assert items[0]["s3Key"] == body["key"]

def test_get_upload_url_invalid_token():
    event = {
        "headers": {"Authorization": "Bearer fake"},
        "body": "{}"
    }
    response = handler(event, {})
    assert response["statusCode"] == 401

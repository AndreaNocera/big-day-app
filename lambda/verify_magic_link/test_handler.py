import json
import time
import pytest
import boto3
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ["ENV"] = "test"

from moto import mock_aws
from handler import handler

@pytest.fixture
def aws_mock():
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="eu-west-1")
        dynamodb.create_table(
            TableName="WeddingInvites",
            KeySchema=[{"AttributeName": "PK", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "PK", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST"
        )
        yield dynamodb

def test_token_valido(aws_mock, monkeypatch):
    # Dobbiamo overridare il db resource nell'handler col mock
    import handler as h
    monkeypatch.setattr(h, "dynamodb", aws_mock)
    
    table = aws_mock.Table("WeddingInvites")
    table.put_item(Item={
        "PK": "TOKEN#abc123",
        "email": "mario@test.com",
        "guestName": "Mario Rossi",
        "tokenUsed": False,
        "expiresAt": int(time.time()) + 86400
    })
    event = {"body": json.dumps({"token": "abc123", "email": "mario@test.com"})}
    response = handler(event, {})
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert "jwt" in body

def test_token_gia_usato(aws_mock, monkeypatch):
    import handler as h
    monkeypatch.setattr(h, "dynamodb", aws_mock)
    
    table = aws_mock.Table("WeddingInvites")
    table.put_item(Item={
        "PK": "TOKEN#used123",
        "email": "mario@test.com",
        "guestName": "Mario Rossi",
        "tokenUsed": True,
        "expiresAt": int(time.time()) + 86400
    })
    event = {"body": json.dumps({"token": "used123", "email": "mario@test.com"})}
    response = handler(event, {})
    assert response["statusCode"] == 401

def test_token_scaduto(aws_mock, monkeypatch):
    import handler as h
    monkeypatch.setattr(h, "dynamodb", aws_mock)
    
    table = aws_mock.Table("WeddingInvites")
    table.put_item(Item={
        "PK": "TOKEN#old123",
        "email": "mario@test.com",
        "guestName": "Mario Rossi",
        "tokenUsed": False,
        "expiresAt": int(time.time()) - 100  # scaduto
    })
    event = {"body": json.dumps({"token": "old123", "email": "mario@test.com"})}
    response = handler(event, {})
    assert response["statusCode"] == 401

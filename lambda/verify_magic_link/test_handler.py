import json
import time
import pytest
import boto3
import os
os.environ["ENV"] = "test"
os.environ["JWT_SECRET"] = "test-secret-at-least-32-bytes-long"

from moto import mock_aws
from verify_magic_link import handler as handler_module

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

def test_phone_and_pin_validi(aws_mock, monkeypatch):
    monkeypatch.setattr(handler_module, "dynamodb", aws_mock)
    
    table = aws_mock.Table("WeddingInvites")
    table.put_item(Item={
        "PK": "TOKEN#test-user",
        "phoneNumber": "+390000000001",
        "accessCode": "1234",
        "guestName": "Test Guest",
        "isAdmin": False,
        "expiresAt": int(time.time()) + 86400
    })
    event = {"body": json.dumps({"phoneNumber": "+390000000001", "accessCode": "1234"})}
    response = handler_module.handler(event, {})
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert "jwt" in body
    assert body["guestName"] == "Test Guest"
    assert body["isAdmin"] is False

def test_pin_errato(aws_mock, monkeypatch):
    monkeypatch.setattr(handler_module, "dynamodb", aws_mock)
    
    table = aws_mock.Table("WeddingInvites")
    table.put_item(Item={
        "PK": "TOKEN#test-user",
        "phoneNumber": "+390000000001",
        "accessCode": "1234",
        "guestName": "Test Guest",
        "expiresAt": int(time.time()) + 86400
    })
    event = {"body": json.dumps({"phoneNumber": "+390000000001", "accessCode": "9999"})}
    response = handler_module.handler(event, {})
    assert response["statusCode"] == 401

def test_credenziali_scadute(aws_mock, monkeypatch):
    monkeypatch.setattr(handler_module, "dynamodb", aws_mock)
    
    table = aws_mock.Table("WeddingInvites")
    table.put_item(Item={
        "PK": "TOKEN#expired-user",
        "phoneNumber": "+390000000001",
        "accessCode": "1234",
        "guestName": "Test Guest",
        "expiresAt": int(time.time()) - 100  # scaduto
    })
    event = {"body": json.dumps({"phoneNumber": "+390000000001", "accessCode": "1234"})}
    response = handler_module.handler(event, {})
    assert response["statusCode"] == 401

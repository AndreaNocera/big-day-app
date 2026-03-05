import json
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

def test_send_invites_success(aws_mock, monkeypatch):
    import handler as h
    monkeypatch.setattr(h, "dynamodb", aws_mock)
    
    # Mock send_sms so it doesn't fail
    sms_called = []
    def mock_send_sms(phone, msg):
        sms_called.append((phone, msg))
    monkeypatch.setattr(h, "send_sms", mock_send_sms)
    
    table = aws_mock.Table("WeddingInvites")
    table.put_item(Item={
        "PK": "TOKEN#test1234",
        "email": "mario@example.com",
        "guestName": "Mario",
        "phoneNumber": "+391234567890",
        "tokenUsed": False
    })
    
    response = handler({}, {})
    assert response["statusCode"] == 200
    assert len(sms_called) == 1
    assert "test1234" in sms_called[0][1]

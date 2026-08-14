import json
import pytest
import boto3
import os
os.environ["ENV"] = "test"
os.environ["JWT_SECRET"] = "test-secret-at-least-32-bytes-long"

from moto import mock_aws
from rsvp_handler import handler as handler_module
import shared.jwt_helper as jwt_helper

@pytest.fixture
def aws_mock():
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="eu-west-1")
        dynamodb.create_table(
            TableName="WeddingRSVP",
            KeySchema=[{"AttributeName": "PK", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "PK", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST"
        )
        yield dynamodb

def test_rsvp_get_restituisce_la_risposta(aws_mock, monkeypatch):
    monkeypatch.setattr(handler_module, "dynamodb", aws_mock)

    table = aws_mock.Table("WeddingRSVP")
    table.put_item(Item={
        "PK": "GUEST#+390000000001",
        "guestName": "Test Guest",
        "attending": True,
        "itemType": "RSVP",
    })

    token = jwt_helper.generate_token("+390000000001", "Test Guest")
    event = {
        "httpMethod": "GET",
        "headers": {"Authorization": f"Bearer {token}"},
    }

    response = handler_module.handler(event, {})
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["guestName"] == "Test Guest"
    assert body["attending"] is True


def test_rsvp_post_rifiutato_perche_chiuso(aws_mock, monkeypatch):
    monkeypatch.setattr(handler_module, "dynamodb", aws_mock)

    token = jwt_helper.generate_token("+390000000001", "Test Guest")
    event = {
        "httpMethod": "POST",
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({"attending": True}),
    }

    response = handler_module.handler(event, {})

    assert response["statusCode"] == 403
    assert aws_mock.Table("WeddingRSVP").scan()["Items"] == []

def test_rsvp_invalid_token():
    event = {
        "httpMethod": "GET",
        "headers": {"Authorization": "Bearer fake_token"},
        "body": "{}"
    }
    response = handler_module.handler(event, {})
    assert response["statusCode"] == 401

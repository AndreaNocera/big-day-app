import json
import os

import boto3
import pytest
from moto import mock_aws

os.environ["ENV"] = "test"
os.environ["JWT_SECRET"] = "test-secret-at-least-32-bytes-long"

from admin_get_rsvps import handler as handler_module
import shared.jwt_helper as jwt_helper


@pytest.fixture
def aws_mock():
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="eu-west-1")
        for table_name in ("WeddingInvites", "WeddingRSVP"):
            dynamodb.create_table(
                TableName=table_name,
                KeySchema=[{"AttributeName": "PK", "KeyType": "HASH"}],
                AttributeDefinitions=[{"AttributeName": "PK", "AttributeType": "S"}],
                BillingMode="PAY_PER_REQUEST",
            )
        yield dynamodb


def test_dashboard_conta_solo_inviti_e_rsvp_reali(aws_mock, monkeypatch):
    monkeypatch.setattr(handler_module, "dynamodb", aws_mock)

    invites = aws_mock.Table("WeddingInvites")
    for item in (
        {"PK": "TOKEN#invite-one", "guestName": "Test Guest One"},
        {"PK": "TOKEN#invite-two", "guestName": "Test Guest Two"},
        {"PK": "PHOTOACCESS#test-hash", "active": True},
        {"PK": "PHOTOGUEST#test-id", "guestName": "Photo Guest"},
    ):
        invites.put_item(Item=item)

    rsvps = aws_mock.Table("WeddingRSVP")
    rsvps.put_item(Item={
        "PK": "GUEST#+390000000001",
        "guestName": "Test Guest One",
        "attending": True,
        "submittedAt": "2026-01-01T12:00:00",
        "itemType": "RSVP",
    })
    rsvps.put_item(Item={
        "PK": "GUEST#+390000000002",
        "guestName": "Test Guest Two",
        "email": "test@example.invalid",
    })

    token = jwt_helper.generate_token(
        "+390000000099",
        "Test Admin",
        is_admin=True,
    )
    response = handler_module.handler(
        {"headers": {"Authorization": f"Bearer {token}"}},
        {},
    )

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["totalInvites"] == 2
    assert len(body["rsvps"]) == 1
    assert body["rsvps"][0]["guestName"] == "Test Guest One"


def test_dashboard_rifiuta_un_utente_non_admin():
    token = jwt_helper.generate_token(
        "+390000000001",
        "Test Guest",
        is_admin=False,
    )

    response = handler_module.handler(
        {"headers": {"Authorization": f"Bearer {token}"}},
        {},
    )

    assert response["statusCode"] == 403

import json
import os

import boto3
import pytest
from moto import mock_aws

os.environ["ENV"] = "test"
os.environ["JWT_SECRET"] = "test-secret-at-least-32-bytes-long"

from guest_register import handler as handler_module


@pytest.fixture
def aws_mock():
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="eu-west-1")
        dynamodb.create_table(
            TableName="WeddingInvites",
            KeySchema=[{"AttributeName": "PK", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "PK", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        yield dynamodb


def test_registrazione_photo_guest(aws_mock, monkeypatch):
    monkeypatch.setattr(handler_module, "dynamodb", aws_mock)
    monkeypatch.setattr(handler_module, "validate_photo_code", lambda _code: True)

    response = handler_module.handler(
        {
            "body": json.dumps(
                {
                    "code": "valid-test-code",
                    "firstName": "Photo",
                    "lastName": "Guest",
                }
            )
        },
        {},
    )

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["guestName"] == "Photo Guest"
    assert body["isPhotoGuest"] is True
    assert "jwt" in body

    items = aws_mock.Table("WeddingInvites").scan()["Items"]
    assert len(items) == 1
    assert items[0]["isPhotoGuest"] is True


def test_registrazione_rifiuta_codice_non_valido(monkeypatch):
    monkeypatch.setattr(handler_module, "validate_photo_code", lambda _code: False)

    response = handler_module.handler(
        {
            "body": json.dumps(
                {
                    "code": "invalid-test-code",
                    "firstName": "Photo",
                    "lastName": "Guest",
                }
            )
        },
        {},
    )

    assert response["statusCode"] == 401


@pytest.mark.parametrize(
    ("first_name", "last_name"),
    [
        ("+390000000000", "Test"),
        ("password", "Test"),
        ("Photo/Guest", "Test"),
        ("Photo1", "Guest"),
        ("A", "Guest"),
        ("Photo", "X" * 61),
    ],
)
def test_registrazione_rifiuta_nomi_non_validi(monkeypatch, first_name, last_name):
    monkeypatch.setattr(handler_module, "validate_photo_code", lambda _code: True)
    response = handler_module.handler({
        "body": json.dumps({
            "code": "valid-test-code",
            "firstName": first_name,
            "lastName": last_name,
        })
    }, {})
    assert response["statusCode"] == 400


def test_registrazione_accetta_unicode_e_comprime_spazi(aws_mock, monkeypatch):
    monkeypatch.setattr(handler_module, "dynamodb", aws_mock)
    monkeypatch.setattr(handler_module, "validate_photo_code", lambda _code: True)
    response = handler_module.handler({
        "body": json.dumps({
            "code": "valid-test-code",
            "firstName": "  Élodie  Marie ",
            "lastName": "D’Angelo-Test",
        })
    }, {})
    assert response["statusCode"] == 200
    assert json.loads(response["body"])["guestName"] == "Élodie Marie D’Angelo-Test"

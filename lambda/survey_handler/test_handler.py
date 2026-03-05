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
            TableName="WeddingRSVP",
            KeySchema=[{"AttributeName": "PK", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "PK", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST"
        )
        yield dynamodb

def test_survey_success(aws_mock, monkeypatch):
    import handler as h
    monkeypatch.setattr(h, "dynamodb", aws_mock)
    
    token = jwt_helper.generate_token("mario@test.com", "Mario")
    
    event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({
            "surveyAnswers": {
                "favoriteSong": "Bohemian Rhapsody",
                "message": "Auguri!"
            }
        })
    }
    
    response = handler(event, {})
    assert response["statusCode"] == 200
    
    table = aws_mock.Table("WeddingRSVP")
    item = table.get_item(Key={"PK": "GUEST#mario@test.com"})["Item"]
    assert item["surveyAnswers"]["favoriteSong"] == "Bohemian Rhapsody"

def test_survey_invalid_token():
    event = {
        "headers": {"Authorization": "Bearer fake_token"},
        "body": "{}"
    }
    response = handler(event, {})
    assert response["statusCode"] == 401

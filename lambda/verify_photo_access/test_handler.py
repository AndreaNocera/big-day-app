import json

from verify_photo_access import handler as handler_module


def test_codice_foto_valido(monkeypatch):
    monkeypatch.setattr(handler_module, "validate_photo_code", lambda code: code == "valid-test-code")

    response = handler_module.handler(
        {"body": json.dumps({"code": "valid-test-code"})},
        {},
    )

    assert response["statusCode"] == 200
    assert json.loads(response["body"])["valid"] is True


def test_codice_foto_non_valido(monkeypatch):
    monkeypatch.setattr(handler_module, "validate_photo_code", lambda _code: False)

    response = handler_module.handler(
        {"body": json.dumps({"code": "invalid-test-code"})},
        {},
    )

    assert response["statusCode"] == 401

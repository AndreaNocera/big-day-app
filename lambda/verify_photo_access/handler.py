import json
import os
import sys

# Add shared folder to path for local execution and AWS Lambda
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.photo_access import validate_photo_code
from shared.api_utils import json_response


def handler(event, context):
    """Valida un codice di accesso foto (link speciale). Endpoint pubblico."""
    try:
        body = json.loads(event.get("body", "{}"))
        code = body.get("code")

        if not code:
            return json_response(400, {"error": "Richiesto codice di accesso"})

        if not validate_photo_code(code):
            return json_response(401, {"error": "Codice di accesso non valido"})

        return json_response(200, {"valid": True})

    except Exception as e:
        print(f"Errore: {e}")
        return json_response(500, {"error": "Errore interno server"})

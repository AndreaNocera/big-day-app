import json
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.aws_clients import dynamodb
from shared.jwt_helper import verify_token
from shared.api_utils import json_response

def handler(event, context):
    try:
        headers = event.get("headers", {})
        auth_header = headers.get("authorization", headers.get("Authorization", ""))
        
        if not auth_header.startswith("Bearer "):
            return json_response(401, {"error": "Non autorizzato"})
            
        token = auth_header.split(" ")[1]
        payload = verify_token(token)
        
        if not payload:
            return json_response(401, {"error": "Token invalido o scaduto"})

        # I "photo guest" (registrati via link foto) non hanno un invito:
        # nessun accesso all'RSVP.
        if payload.get("isPhotoGuest", False):
            return json_response(403, {"error": "RSVP non disponibile per questo profilo"})

        phone = payload.get("phone")
        method = event.get("httpMethod", "POST").upper()

        # Le conferme sono chiuse. Manteniamo la route POST per compatibilita'
        # con i client esistenti, ma il vincolo e' applicato dal backend.
        if method != "GET":
            return json_response(403, {"error": "Le conferme di presenza sono chiuse"})

        table = dynamodb.Table("WeddingRSVP")

        if method == "GET":
            response = table.get_item(Key={"PK": f"GUEST#{phone}"})
            item = response.get("Item", {})
            return json_response(200, item)
        
    except Exception as e:
        print(f"Errore: {e}")
        return json_response(500, {"error": "Errore interno server"})

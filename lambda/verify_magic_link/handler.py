import json
import time
import os
import sys

# Add shared folder to path for local execution and AWS Lambda
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.aws_clients import dynamodb
from shared.jwt_helper import generate_token
from shared.api_utils import json_response

def handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        phone = body.get("phoneNumber") or body.get("phone")
        code = body.get("accessCode")

        if not phone or not code:
            return json_response(400, {"error": "Richiesti (phoneNumber + accessCode)"})

        table = dynamodb.Table("WeddingInvites")
        
        # Login tramite Numero di Telefono + PIN
        # Usiamo Scan perché in locale non abbiamo GSI configurati.
        # In produzione per DB grandi sarebbe meglio un GSI o un Auth table separato.
        response = table.scan(
            FilterExpression="phoneNumber = :phone AND accessCode = :code",
            ExpressionAttributeValues={
                ":phone": phone,
                ":code": code
            }
        )
        items = response.get("Items", [])
        if not items:
            return json_response(401, {"error": "Numero di telefono o PIN errati"})
        
        item = items[0]

        # Validazione scadenze comuni
        if item.get("expiresAt", 0) < int(time.time()):
            return json_response(401, {"error": "Credenziali scadute"})

        # Generate token with phone instead of email
        is_admin = bool(item.get("isAdmin", False))
        jwt_token = generate_token(item.get("phoneNumber", phone), item.get("guestName", ""), is_admin)

        return json_response(200, {
            "message": "Autenticazione riuscita",
            "jwt": jwt_token,
            "guestName": item.get("guestName"),
            "isAdmin": is_admin
        })
        
    except Exception as e:
        print(f"Errore: {e}")
        return json_response(500, {"error": "Errore interno server"})

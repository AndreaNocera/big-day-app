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
        token = body.get("token")
        email_provided = body.get("email") # Legacy magic links might still have this? We'll prioritize phone. But wait, magic links currently have email, we'll change it to phone. Let's look for phone in body payload or url query. Actually body gets it from frontend verifyMagicLink(args). We'll update frontend to pass phone instead of email when verifying magic link.
        phone = body.get("phoneNumber") or body.get("phone")
        code = body.get("accessCode")

        table = dynamodb.Table("WeddingInvites")
        item = None

        if token and phone:
            # Login tramite Magic Link usando phone invece di email
            response = table.get_item(Key={"PK": f"TOKEN#{token}"})
            item = response.get("Item")
            
            if not item:
                return json_response(404, {"error": "Token inesistente"})
                
            if item.get("magicLinkUsed"):
                return json_response(401, {"error": "Questo magic link è già stato utilizzato. Usa il numero di telefono e il PIN per accedere."})
                
            if item.get("phoneNumber") != phone:
                return json_response(401, {"error": "Numero di telefono non corrispondente"})
                
        elif phone and code:
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
            
        else:
            return json_response(400, {"error": "Richiesti (token + phoneNumber) oppure (phoneNumber + accessCode)"})

        # Validazione scadenze comuni
        if item.get("expiresAt", 0) < int(time.time()):
            return json_response(401, {"error": "Credenziali o token scaduti"})

        # Generate token with phone instead of email
        jwt_token = generate_token(item.get("phoneNumber", phone), item.get("guestName", ""))

        if token and phone:
            # Invalidiamo il magic link dopo il primo utilizzo
            table.update_item(
                Key={"PK": f"TOKEN#{token}"},
                UpdateExpression="SET magicLinkUsed = :val",
                ExpressionAttributeValues={":val": True}
            )

        return json_response(200, {
            "message": "Autenticazione riuscita",
            "jwt": jwt_token,
            "guestName": item.get("guestName")
        })
        
    except Exception as e:
        print(f"Errore: {e}")
        return json_response(500, {"error": "Errore interno server"})

import json
import time
import os
import sys

# Add shared folder to path for local execution and AWS Lambda
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.aws_clients import dynamodb
from shared.jwt_helper import generate_token

def handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        token = body.get("token")
        email = body.get("email")
        phone = body.get("phoneNumber")
        code = body.get("accessCode")

        table = dynamodb.Table("WeddingInvites")
        item = None

        if token and email:
            # Login tramite Magic Link
            response = table.get_item(Key={"PK": f"TOKEN#{token}"})
            item = response.get("Item")
            
            if not item:
                return {"statusCode": 404, "body": json.dumps({"error": "Token inesistente"})}
                
            if item.get("email") != email:
                return {"statusCode": 401, "body": json.dumps({"error": "Email non corrispondente"})}
                
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
                return {"statusCode": 401, "body": json.dumps({"error": "Numero di telefono o PIN errati"})}
            item = items[0]
            email = item.get("email") # Recuperiamo l'email per il JWT
            
        else:
            return {"statusCode": 400, "body": json.dumps({"error": "Richiesti (token + email) oppure (phoneNumber + accessCode)"})}

        # Validazione scadenze comuni
        if item.get("expiresAt", 0) < int(time.time()):
            return {"statusCode": 401, "body": json.dumps({"error": "Credenziali o token scaduti"})}

        jwt_token = generate_token(email, item.get("guestName", ""))

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Autenticazione riuscita",
                "jwt": jwt_token,
                "guestName": item.get("guestName")
            })
        }
        
    except Exception as e:
        print(f"Errore: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": "Errore interno server"})}

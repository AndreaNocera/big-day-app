import json
import os
import sys
from datetime import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.aws_clients import dynamodb
from shared.jwt_helper import verify_token

def handler(event, context):
    try:
        headers = event.get("headers", {})
        auth_header = headers.get("authorization", headers.get("Authorization", ""))
        
        if not auth_header.startswith("Bearer "):
            return {"statusCode": 401, "body": json.dumps({"error": "Non autorizzato"})}
            
        token = auth_header.split(" ")[1]
        payload = verify_token(token)
        
        if not payload:
            return {"statusCode": 401, "body": json.dumps({"error": "Token invalido o scaduto"})}
            
        phone = payload.get("phone")
        
        body = json.loads(event.get("body", "{}"))
        email = body.get("email", "").strip()
        
        if not email:
            return {"statusCode": 400, "body": json.dumps({"error": "Email mancante"})}
        
        table = dynamodb.Table("WeddingRSVP")
        
        # UpdateItem to add email securely associated with their phone context
        table.update_item(
            Key={"PK": f"GUEST#{phone}"},
            UpdateExpression="SET email = :e, updatedAt = :u",
            ExpressionAttributeValues={
                ":e": email,
                ":u": datetime.utcnow().isoformat()
            }
        )
        
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Profilo aggiornato con successo"})
        }
        
    except Exception as e:
        print(f"Errore: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": "Errore interno server"})}

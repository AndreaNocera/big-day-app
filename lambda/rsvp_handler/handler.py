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
            
        email = payload.get("email")
        guest_name = payload.get("name")
        
        body = json.loads(event.get("body", "{}"))
        attending = body.get("attending", False)
        plus_one = body.get("plusOne", False)
        dietary_restrictions = body.get("dietaryRestrictions", "")
        
        table = dynamodb.Table("WeddingRSVP")
        
        item = {
            "PK": f"GUEST#{email}",
            "guestName": guest_name,
            "attending": attending,
            "plusOne": plus_one,
            "dietaryRestrictions": dietary_restrictions,
            "submittedAt": datetime.utcnow().isoformat()
        }
        
        # In Prod use UpdateItem to preserve surveyAnswers if present, but PutItem is fine for now
        # Actually UpdateItem is safer
        table.update_item(
            Key={"PK": f"GUEST#{email}"},
            UpdateExpression="SET guestName = :n, attending = :a, plusOne = :p, dietaryRestrictions = :d, submittedAt = :s",
            ExpressionAttributeValues={
                ":n": guest_name,
                ":a": attending,
                ":p": plus_one,
                ":d": dietary_restrictions,
                ":s": datetime.utcnow().isoformat()
            }
        )
        
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "RSVP salvato con successo"})
        }
        
    except Exception as e:
        print(f"Errore: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": "Errore interno server"})}

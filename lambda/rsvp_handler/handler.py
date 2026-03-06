import json
import os
import sys
from datetime import datetime

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
            
        phone = payload.get("phone")
        guest_name = payload.get("name")
        
        body = json.loads(event.get("body", "{}"))
        attending = body.get("attending", False)
        plus_one = body.get("plusOne", False)
        dietary_restrictions = body.get("dietaryRestrictions", "")
        
        table = dynamodb.Table("WeddingRSVP")
        
        item = {
            "PK": f"GUEST#{phone}",
            "guestName": guest_name,
            "attending": attending,
            "plusOne": plus_one,
            "dietaryRestrictions": dietary_restrictions,
            "phoneNumber": phone,
            "submittedAt": datetime.utcnow().isoformat()
        }
        
        # In Prod use UpdateItem to preserve surveyAnswers or email if present, but PutItem is fine for now
        # Actually UpdateItem is safer
        table.update_item(
            Key={"PK": f"GUEST#{phone}"},
            UpdateExpression="SET guestName = :n, attending = :a, plusOne = :p, dietaryRestrictions = :d, phoneNumber = :ph, submittedAt = :s",
            ExpressionAttributeValues={
                ":n": guest_name,
                ":a": attending,
                ":p": plus_one,
                ":d": dietary_restrictions,
                ":ph": phone,
                ":s": datetime.utcnow().isoformat()
            }
        )
        
        return json_response(200, {"message": "RSVP salvato con successo"})
        
    except Exception as e:
        print(f"Errore: {e}")
        return json_response(500, {"error": "Errore interno server"})

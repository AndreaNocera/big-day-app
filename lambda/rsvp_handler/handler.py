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

        # I "photo guest" (registrati via link foto) non hanno un invito:
        # nessun accesso all'RSVP.
        if payload.get("isPhotoGuest", False):
            return json_response(403, {"error": "RSVP non disponibile per questo profilo"})

        phone = payload.get("phone")
        guest_name = payload.get("name")
        
        method = event.get("httpMethod", "POST")
        
        table = dynamodb.Table("WeddingRSVP")
        
        if method == "GET":
            response = table.get_item(Key={"PK": f"GUEST#{phone}"})
            item = response.get("Item", {})
            return json_response(200, item)

        body = json.loads(event.get("body", "{}"))
        attending = body.get("attending", False)
        guests = body.get("guests", [])  # List of {name: str, isChild: bool}
        dietary_restrictions = body.get("dietaryRestrictions", "")
        sleep_at_castle = body.get("sleepAtCastle")
        bus_interested = body.get("busInterested")
        
        # Add types to guests
        processed_guests = []
        for g in guests:
            processed_guests.append({
                **g,
                "type": "GUEST"
            })
            
        table.update_item(
            Key={"PK": f"GUEST#{phone}"},
            UpdateExpression="SET guestName = :n, attending = :a, guests = :g, dietaryRestrictions = :d, sleepAtCastle = :sac, busInterested = :bus, phoneNumber = :ph, submittedAt = :s, itemType = :t",
            ExpressionAttributeValues={
                ":n": guest_name,
                ":a": attending,
                ":g": processed_guests,
                ":d": dietary_restrictions,
                ":sac": sleep_at_castle,
                ":bus": bus_interested,
                ":ph": phone,
                ":s": datetime.utcnow().isoformat(),
                ":t": "RSVP"
            }
        )
        
        return json_response(200, {"message": "RSVP salvato con successo"})
        
    except Exception as e:
        print(f"Errore: {e}")
        return json_response(500, {"error": "Errore interno server"})

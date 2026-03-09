import json
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.aws_clients import dynamodb, send_sms

def handler(event, context):
    try:
        table = dynamodb.Table("WeddingInvites")
        
        # Scan for all invites
        response = table.scan()
        items = response.get("Items", [])
        
        frontend_url = os.getenv("VITE_PUBLIC_FRONTEND_URL", "http://localhost:5173")
        
        count = 0
        for item in items:
            pk = item.get("PK", "")
            if pk.startswith("TOKEN#"):
                token = pk.split("#")[1]
                phone = item.get("phoneNumber")
                name = item.get("guestName", "Ospite")
                
                if phone:
                    # Magic link is removed. Only provide instructions for Phone + PIN login.
                    message = f"Ciao {name}, ecco il tuo invito al matrimonio! Entra su {frontend_url}/accedi usando il tuo numero di telefono e il PIN: {access_code}"
                    send_sms(phone, message)
                    count += 1
                    
        return {
            "statusCode": 200,
            "body": json.dumps({"message": f"Inviati {count} inviti"})
        }
        
    except Exception as e:
        print(f"Errore: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": "Errore interno server"})}

import boto3
import uuid
import time
import random
import os
from datetime import datetime

def seed_guests():
    dynamodb = boto3.resource(
        "dynamodb",
        endpoint_url="http://localhost:8001", # Running locally from host
        region_name="eu-west-1",
        aws_access_key_id="dummy",
        aws_secret_access_key="dummy"
    )
    
    table = dynamodb.Table("WeddingInvites")
    
    guests = [
        {"name": "Andrea Nocera", "phone": "+393389374650"},
        # {"name": "Luigi Verdi", "phone": "+393339876543"}
    ]
    
    for guest in guests:
        token = str(uuid.uuid4())
        access_code = "0000"
        expiry_days = int(os.getenv("TOKEN_EXPIRY_DAYS", "30"))
        item = {
            "PK": f"TOKEN#{token}",
            "guestName": guest["name"],
            "phoneNumber": guest["phone"],
            "accessCode": access_code,
            "expiresAt": int(time.time()) + (expiry_days * 86400),
            "createdAt": datetime.now().isoformat()
        }
        table.put_item(Item=item)
        print(f"Invito generato per {guest['name']} - PIN: {access_code} - Telefono: {guest['phone']}")

if __name__ == "__main__":
    seed_guests()

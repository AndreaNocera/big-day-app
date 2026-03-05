import boto3
import uuid
import time
import random
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
        {"email": "andrea.nocera5@gmail.com", "name": "Andrea Nocera", "phone": "+393389374650"},
        # {"email": "luigi.verdi@example.com", "name": "Luigi Verdi", "phone": "+393339876543"}
    ]
    
    for guest in guests:
        token = str(uuid.uuid4())
        access_code = str(random.randint(1000, 9999))
        item = {
            "PK": f"TOKEN#{token}",
            "email": guest["email"],
            "guestName": guest["name"],
            "phoneNumber": guest["phone"],
            "accessCode": access_code,
            "expiresAt": int(time.time()) + (30 * 86400), # 30 days
            "createdAt": datetime.now().isoformat()
        }
        table.put_item(Item=item)
        print(f"Invito generato per {guest['name']} - Token: {token} - PIN: {access_code}")

if __name__ == "__main__":
    seed_guests()

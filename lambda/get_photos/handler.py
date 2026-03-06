import json
import os
import sys
from datetime import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.aws_clients import s3, dynamodb
from shared.jwt_helper import verify_token

def handler(event, context):
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": True
    }
    try:
        headers = event.get("headers", {})
        auth_header = headers.get("authorization", headers.get("Authorization", ""))
        
        if not auth_header.startswith("Bearer "):
            return {"statusCode": 401, "headers": cors_headers, "body": json.dumps({"error": "Non autorizzato"})}
            
        token = auth_header.split(" ")[1]
        payload = verify_token(token)
        
        if not payload:
            return {"statusCode": 401, "headers": cors_headers, "body": json.dumps({"error": "Token invalido o scaduto"})}
            
        # Scan for photos
        table = dynamodb.Table("WeddingPhotos")
        response = table.scan()
        items = response.get("Items", [])
        
        # Sort by date
        items.sort(key=lambda x: x.get("uploadedAt", ""), reverse=True)
        
        bucket_name = "wedding-photos-local" if os.getenv("ENV", "local") == "local" else os.getenv("S3_BUCKET", "wedding-photos-prod")
        
        photos = []
        for item in items:
            s3_key = item.get("s3Key")
            if not s3_key:
                continue
                
            # Generate GET presigned URL
            try:
                url = s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': bucket_name, 'Key': s3_key},
                    ExpiresIn=3600
                )
                
                # In local dev, fix the URL if needed
                if os.getenv("ENV", "local") == "local":
                    url = url.replace("http://minio:9000", "http://localhost:9000")
                
                photos.append({
                    "PK": item.get("PK"),
                    "url": url,
                    "uploadedBy": item.get("uploadedBy"),
                    "uploadedAt": item.get("uploadedAt")
                })
            except Exception as e:
                print(f"Errore generazione URL per {s3_key}: {e}")
                
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({"photos": photos})
        }
        
    except Exception as e:
        print(f"Errore get_photos: {e}")
        return {"statusCode": 500, "headers": cors_headers, "body": json.dumps({"error": "Errore interno server"})}

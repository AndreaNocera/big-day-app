import json
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.aws_clients import s3, dynamodb
from shared.jwt_helper import verify_token
from shared.media_utils import infer_media_type

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
            
        # Filter photos by the current user's phone
        phone = payload.get("phone")
        table = dynamodb.Table("WeddingPhotos")
        
        # Using scan with FilterExpression for simplicity in local dev (no GSI)
        response = table.scan(
            FilterExpression="uploadedBy = :phone",
            ExpressionAttributeValues={":phone": phone}
        )
        items = response.get("Items", [])
        
        # Sort by date
        items.sort(key=lambda x: x.get("uploadedAt", ""), reverse=True)
        
        bucket_name = "wedding-photos-local" if os.getenv("ENV", "local") == "local" else os.getenv("S3_BUCKET", "wedding-photos-prod")
        
        photos = []
        for item in items:
            if item.get("deletedAt"):
                continue

            media_type = infer_media_type(item)
            photo_entry = {
                "PK": item.get("PK"),
                "uploadedBy": item.get("uploadedBy"),
                "uploadedAt": item.get("uploadedAt"),
                "isOptimized": media_type == "image" and "thumbKey" in item,
                "mediaType": media_type,
                "contentType": item.get("contentType"),
            }

            # Agli utenti normali i video sono rappresentati solo da un placeholder:
            # non generiamo ne' restituiamo URL firmati dell'originale.
            if media_type == "video":
                photos.append(photo_entry)
                continue

            # Le immagini vengono esposte soltanto tramite thumbnail. Finche' il
            # processore non l'ha creata, restituiamo il record senza URL per
            # permettere al frontend di mostrare lo stato di elaborazione.
            thumb_key = item.get("thumbKey")
            if not thumb_key:
                photos.append(photo_entry)
                continue

            try:
                url = s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': bucket_name, 'Key': thumb_key},
                    ExpiresIn=3600
                )
                
                # In local dev, fix the URL if needed
                if os.getenv("ENV", "local") == "local":
                    url = url.replace("http://minio:9000", "http://localhost:9000")
                
                photo_entry["url"] = url
                photos.append(photo_entry)
            except Exception as e:
                print(f"Errore generazione URL per {thumb_key}: {e}")
                
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({"photos": photos})
        }
        
    except Exception as e:
        print(f"Errore get_photos: {e}")
        return {"statusCode": 500, "headers": cors_headers, "body": json.dumps({"error": "Errore interno server"})}

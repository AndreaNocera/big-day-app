import json
import os
import sys

from boto3.dynamodb.conditions import Key

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from photo_shared.aws_clients import s3, dynamodb, presigning_s3_client
from shared.jwt_helper import verify_token
from photo_shared.media_utils import infer_media_type

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
            
        # UploadedByIndex evita la scansione completa della tabella condivisa.
        phone = payload.get("phone")
        table = dynamodb.Table("WeddingPhotos")
        query_args = {
            "IndexName": "UploadedByIndex",
            "KeyConditionExpression": Key("uploadedBy").eq(phone),
            "ScanIndexForward": False,
        }
        items = []
        while True:
            response = table.query(**query_args)
            items.extend(response.get("Items", []))
            if not response.get("LastEvaluatedKey"):
                break
            query_args["ExclusiveStartKey"] = response["LastEvaluatedKey"]
        
        bucket_name = "wedding-photos-local" if os.getenv("ENV", "local") == "local" else os.getenv("S3_BUCKET", "wedding-photos-prod")
        
        photos = []
        for item in items:
            if item.get("deletedAt") or item.get("uploadStatus") != "completed":
                continue

            media_type = infer_media_type(item)
            expected_processing = "not_required" if media_type == "video" else "completed"
            if item.get("processingStatus") != expected_processing:
                continue
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

            thumb_key = item.get("thumbKey")
            if not thumb_key:
                continue

            try:
                url = presigning_s3_client(s3).generate_presigned_url(
                    'get_object',
                    Params={'Bucket': bucket_name, 'Key': thumb_key},
                    ExpiresIn=3600
                )
                
                # In local dev, fix the URL if needed
                photo_entry["url"] = url
                photos.append(photo_entry)
            except Exception as e:
                print(f"Errore generazione URL thumbnail: {type(e).__name__}")
                
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({"photos": photos})
        }
        
    except Exception as e:
        print(f"Get photos error: {type(e).__name__}")
        return {"statusCode": 500, "headers": cors_headers, "body": json.dumps({"error": "Errore interno server"})}

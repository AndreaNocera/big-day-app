import json
import os
import sys

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

        # Admin-only endpoint
        if not payload.get("isAdmin", False):
            return {"statusCode": 403, "headers": cors_headers, "body": json.dumps({"error": "Accesso non autorizzato"})}

        table = dynamodb.Table("WeddingPhotos")
        response = table.scan()
        items = response.get("Items", [])

        # Handle pagination
        while "LastEvaluatedKey" in response:
            response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
            items.extend(response.get("Items", []))

        bucket_name = "wedding-photos-local" if os.getenv("ENV", "local") == "local" else os.getenv("S3_BUCKET", "wedding-photos-prod")

        # Group photos by guest (uploadedBy = phone number)
        photos_by_guest: dict = {}
        for item in items:
            if item.get("deletedAt"):
                continue

            uploaded_by = item.get("uploadedBy", "Sconosciuto")
            guest_name = item.get("uploaderName", "Ospite Sconosciuto")
            media_type = infer_media_type(item)

            photo_entry = {
                "PK": item.get("PK"),
                "uploadedBy": uploaded_by,
                "guestName": guest_name,
                "uploadedAt": item.get("uploadedAt", ""),
                "isOptimized": media_type == "image" and "thumbKey" in item,
                "mediaType": media_type,
                "contentType": item.get("contentType"),
                "uploadStatus": item.get("uploadStatus", "completed"),
                "processingStatus": item.get(
                    "processingStatus",
                    "not_required" if media_type == "video" else "completed",
                ),
                "processingAttempts": item.get("processingAttempts", 0),
                "processingUpdatedAt": item.get("processingUpdatedAt"),
                "failedAt": item.get("failedAt"),
                "failureCode": item.get("failureCode"),
            }

            # I video non ricevono URL durante il caricamento della galleria:
            # l'admin lo richiede on demand quando preme play o download.
            if (
                media_type == "image"
                and photo_entry["uploadStatus"] == "completed"
                and photo_entry["processingStatus"] == "completed"
            ):
                # La lista espone solo la thumbnail. L'originale viene firmato
                # on demand dall'endpoint admin quando si preme download.
                thumb_key = item.get("thumbKey")
                if thumb_key:
                    try:
                        thumb_url = presigning_s3_client(s3).generate_presigned_url(
                            'get_object',
                            Params={'Bucket': bucket_name, 'Key': thumb_key},
                            ExpiresIn=3600
                        )

                        photo_entry["thumbUrl"] = thumb_url
                    except Exception as e:
                        print(f"Errore generazione URL thumbnail: {type(e).__name__}")

            if uploaded_by not in photos_by_guest:
                photos_by_guest[uploaded_by] = {
                    "guestName": guest_name,
                    "phone": uploaded_by,
                    "photos": []
                }
            photos_by_guest[uploaded_by]["photos"].append(photo_entry)

        # Sort photos within each group by date desc
        for guest in photos_by_guest.values():
            guest["photos"].sort(key=lambda x: x.get("uploadedAt", ""), reverse=True)

        # Convert to list sorted by guest name
        guests_list = sorted(photos_by_guest.values(), key=lambda x: x.get("guestName", ""))

        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({"guests": guests_list}, default=str)
        }

    except Exception as e:
        print(f"Admin get photos error: {type(e).__name__}")
        return {"statusCode": 500, "headers": cors_headers, "body": json.dumps({"error": "Errore interno server"})}

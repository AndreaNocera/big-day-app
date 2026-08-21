import json
import os
import sys
import uuid
import time
from datetime import datetime, timezone

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from photo_shared.aws_clients import s3, dynamodb, presigning_s3_client
from shared.jwt_helper import verify_token
from shared.photo_access import validate_photo_code
from shared.api_utils import json_response
from photo_shared.media_utils import get_media_config, slugify_uploader_name

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

        # Autorizzazione upload: admin sempre, altrimenti serve un codice
        # di accesso foto valido (header X-Photo-Code, dal link speciale).
        is_admin = bool(payload.get("isAdmin", False))
        photo_code = headers.get("x-photo-code", headers.get("X-Photo-Code", ""))
        if not is_admin and not validate_photo_code(photo_code):
            return json_response(403, {"error": "Caricamento foto e video non abilitato"})

        uploader_name = str(payload.get("name") or "Ospite")
        uploader_slug = slugify_uploader_name(uploader_name)
        
        body = json.loads(event.get("body", "{}"))
        filename = body.get("filename", "")
        content_type = (body.get("contentType") or "").lower()

        if not filename:
            return json_response(400, {"error": "Filename mancante"})

        media_config = get_media_config(content_type)
        if not media_config:
            return json_response(400, {
                "error": "Formato non supportato: sono ammessi JPEG, PNG, WebP, HEIC, HEIF, MP4, MOV e WebM"
            })

        ext = media_config["extension"]
        media_type = media_config["mediaType"]

        # L'UUID completo rende univoca la chiave anche tra utenti omonimi.
        photo_id = str(uuid.uuid4())
        s3_key = f"uploads/{uploader_slug}/{photo_id}.{ext}"
        now = int(time.time())
        upload_url_expiry = now + int(os.getenv("UPLOAD_URL_EXPIRY_SECONDS", "3600"))
        cleanup_after = now + int(
            os.getenv("UPLOAD_RECONCILIATION_DELAY_SECONDS", "14400")
        )
        
        bucket_name = "wedding-photos-local" if os.getenv("ENV", "local") == "local" else os.getenv("S3_BUCKET", "wedding-photos-prod")
        
        # Generate presigned URL
        presigned_url = presigning_s3_client(s3).generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': s3_key,
                'ContentType': content_type
            },
            ExpiresIn=int(os.getenv("UPLOAD_URL_EXPIRY_SECONDS", "3600"))
        )
        
        # In local dev, fix the URL if needed so browser can reach it
        # Save placeholder in DB
        table = dynamodb.Table("WeddingPhotos")
        table.put_item(
            Item={
                "PK": f"PHOTO#{photo_id}",
                "uploadedBy": payload.get("phone"),
                "uploaderName": uploader_name,
                "s3Key": s3_key,
                "uploadedAt": datetime.now(timezone.utc).isoformat(),
                "approved": False,
                "type": "PHOTO",
                "mediaType": media_type,
                "contentType": content_type,
                "uploadStatus": "pending",
                "processingStatus": "pending",
                "processingAttempts": 0,
                "uploadExpiresAt": upload_url_expiry,
                "cleanupAfter": cleanup_after,
            }
        )
        
        return json_response(200, {
            "uploadUrl": presigned_url,
            "key": s3_key,
            "photoId": f"PHOTO#{photo_id}",
        })
        
    except Exception as e:
        print(f"Upload URL error: {type(e).__name__}")
        return json_response(500, {"error": "Errore interno server"})

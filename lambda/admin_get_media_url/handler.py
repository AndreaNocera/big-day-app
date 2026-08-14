import json
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.api_utils import json_response
from shared.aws_clients import dynamodb, s3
from shared.jwt_helper import verify_token
from shared.media_utils import infer_media_type


URL_EXPIRY_SECONDS = 600


def handler(event, context):
    """Genera un URL GET temporaneo solo quando un admin apre o scarica un video."""
    try:
        headers = event.get("headers", {})
        auth_header = headers.get("authorization", headers.get("Authorization", ""))

        if not auth_header.startswith("Bearer "):
            return json_response(401, {"error": "Non autorizzato"})

        payload = verify_token(auth_header.split(" ", 1)[1])
        if not payload:
            return json_response(401, {"error": "Token invalido o scaduto"})
        if not payload.get("isAdmin", False):
            return json_response(403, {"error": "Accesso non autorizzato"})

        body = json.loads(event.get("body") or "{}")
        photo_id = body.get("photoId", "")
        disposition = body.get("disposition", "inline")

        if not isinstance(photo_id, str) or not photo_id.startswith("PHOTO#"):
            return json_response(400, {"error": "Identificatore media non valido"})
        if disposition not in {"inline", "attachment"}:
            return json_response(400, {"error": "Modalita' non valida"})

        item = dynamodb.Table("WeddingPhotos").get_item(Key={"PK": photo_id}).get("Item")
        if not item:
            return json_response(404, {"error": "Media non trovato"})
        if infer_media_type(item) != "video":
            return json_response(400, {"error": "Il media richiesto non e' un video"})

        s3_key = item.get("s3Key")
        if not s3_key:
            return json_response(404, {"error": "File video non trovato"})

        extension = s3_key.rsplit(".", 1)[-1].lower()
        content_disposition = "inline"
        if disposition == "attachment":
            content_disposition = f'attachment; filename="video.{extension}"'

        bucket_name = (
            "wedding-photos-local"
            if os.getenv("ENV", "local") == "local"
            else os.getenv("S3_BUCKET", "wedding-photos-prod")
        )
        url = s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": bucket_name,
                "Key": s3_key,
                "ResponseContentDisposition": content_disposition,
            },
            ExpiresIn=URL_EXPIRY_SECONDS,
        )

        if os.getenv("ENV", "local") == "local":
            url = url.replace("http://minio:9000", "http://localhost:9000")

        return json_response(200, {"url": url, "expiresIn": URL_EXPIRY_SECONDS})
    except (json.JSONDecodeError, TypeError):
        return json_response(400, {"error": "Richiesta non valida"})
    except Exception as exc:
        print(f"Errore generazione URL media admin: {exc}")
        return json_response(500, {"error": "Errore interno server"})

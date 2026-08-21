import json
import os
import sys
from datetime import datetime, timezone

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.api_utils import json_response
from photo_shared.aws_clients import dynamodb, s3
from shared.jwt_helper import verify_token


MAX_MEDIA_PER_REQUEST = 500
BATCH_GET_SIZE = 100
S3_DELETE_BATCH_SIZE = 1000


def _chunks(values, size):
    for index in range(0, len(values), size):
        yield values[index:index + size]


def _load_items(table, photo_ids):
    items = []
    for photo_id_batch in _chunks(photo_ids, BATCH_GET_SIZE):
        pending = {
            table.name: {
                "Keys": [{"PK": photo_id} for photo_id in photo_id_batch],
                "ConsistentRead": True,
            }
        }
        attempts = 0
        while pending and attempts < 5:
            response = dynamodb.batch_get_item(RequestItems=pending)
            items.extend(response.get("Responses", {}).get(table.name, []))
            pending = response.get("UnprocessedKeys", {})
            attempts += 1
        if pending:
            raise RuntimeError("Impossibile leggere tutti i media richiesti")
    return items


def _mark_deleted(table, items, mode, deleted_at, deleted_by):
    for item in items:
        table.update_item(
            Key={"PK": item["PK"]},
            UpdateExpression=(
                "SET deletedAt = :deleted_at, deletionMode = :mode, "
                "deletedBy = :deleted_by"
            ),
            ExpressionAttributeValues={
                ":deleted_at": deleted_at,
                ":mode": mode,
                ":deleted_by": deleted_by,
            },
            ConditionExpression="attribute_exists(PK)",
        )


def _delete_s3_objects(bucket_name, items):
    object_keys = {
        key
        for item in items
        for key in (item.get("s3Key"), item.get("thumbKey"))
        if key
    }
    for key_batch in _chunks(list(object_keys), S3_DELETE_BATCH_SIZE):
        response = s3.delete_objects(
            Bucket=bucket_name,
            Delete={
                "Objects": [{"Key": key} for key in key_batch],
                "Quiet": True,
            },
        )
        if response.get("Errors"):
            raise RuntimeError("Uno o piu' file non sono stati eliminati da S3")
    return len(object_keys)


def handler(event, context):
    """Elimina media: admin su tutto, utenti solo fisicamente sui propri file."""
    try:
        headers = event.get("headers", {})
        auth_header = headers.get("authorization", headers.get("Authorization", ""))
        if not auth_header.startswith("Bearer "):
            return json_response(401, {"error": "Non autorizzato"})

        payload = verify_token(auth_header.split(" ", 1)[1])
        if not payload:
            return json_response(401, {"error": "Token invalido o scaduto"})

        is_admin = bool(payload.get("isAdmin", False))
        # Per gli invitati e' il telefono; per chi si registra dal link foto e'
        # l'identificativo sintetico photoguest:<uuid>. In entrambi i casi e'
        # lo stesso valore scritto in uploadedBy durante la creazione del media.
        requester_id = str(payload.get("phone") or "")
        if not is_admin and not requester_id:
            return json_response(403, {"error": "Accesso non autorizzato"})

        body = json.loads(event.get("body") or "{}")
        photo_ids = body.get("photoIds")
        mode = body.get("mode")

        if mode not in {"logical", "physical"}:
            return json_response(400, {"error": "Modalita' di eliminazione non valida"})
        if not isinstance(photo_ids, list) or not photo_ids:
            return json_response(400, {"error": "Seleziona almeno un media"})
        if len(photo_ids) > MAX_MEDIA_PER_REQUEST:
            return json_response(400, {"error": "Troppi media in una singola richiesta"})

        unique_photo_ids = list(dict.fromkeys(photo_ids))
        if any(
            not isinstance(photo_id, str) or not photo_id.startswith("PHOTO#")
            for photo_id in unique_photo_ids
        ):
            return json_response(400, {"error": "Identificatore media non valido"})
        if not is_admin and (mode != "physical" or len(unique_photo_ids) != 1):
            return json_response(403, {
                "error": "Puoi eliminare definitivamente un solo contenuto alla volta"
            })

        table = dynamodb.Table("WeddingPhotos")
        items = _load_items(table, unique_photo_ids)
        if not items:
            # Risposta idempotente: consente di ripetere in sicurezza una
            # cancellazione massiva interrotta dopo uno o piu' batch.
            return json_response(200, {
                "mode": mode,
                "deletedCount": 0,
                "missingCount": len(unique_photo_ids),
                "deletedS3Objects": 0,
            })

        if not is_admin and any(
            str(item.get("uploadedBy") or "") != requester_id
            for item in items
        ):
            return json_response(403, {"error": "Non puoi eliminare contenuti caricati da altri utenti"})

        deleted_at = datetime.now(timezone.utc).isoformat()
        deleted_by = requester_id or "admin"
        _mark_deleted(table, items, mode, deleted_at, deleted_by)

        deleted_s3_objects = 0
        if mode == "physical":
            bucket_name = (
                "wedding-photos-local"
                if os.getenv("ENV", "local") == "local"
                else os.getenv("S3_BUCKET", "wedding-photos-prod")
            )
            deleted_s3_objects = _delete_s3_objects(bucket_name, items)
            with table.batch_writer() as batch:
                for item in items:
                    batch.delete_item(Key={"PK": item["PK"]})

        return json_response(200, {
            "mode": mode,
            "deletedCount": len(items),
            "missingCount": len(unique_photo_ids) - len(items),
            "deletedS3Objects": deleted_s3_objects,
        })
    except (json.JSONDecodeError, TypeError):
        return json_response(400, {"error": "Richiesta non valida"})
    except Exception as exc:
        print(f"Errore eliminazione media: {exc}")
        return json_response(500, {"error": "Errore durante l'eliminazione dei media"})

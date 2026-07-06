import json
import os
import sys
import time
import uuid
from datetime import datetime

# Add shared folder to path for local execution and AWS Lambda
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.aws_clients import dynamodb
from shared.jwt_helper import generate_token
from shared.photo_access import validate_photo_code
from shared.api_utils import json_response


def handler(event, context):
    """Registra un "photo guest": utente senza invito a DB che possiede il link speciale.

    Riceve codice + nome e cognome, valida il codice e crea un profilo minimale.
    Il JWT emesso ha isPhotoGuest=True: niente RSVP, solo foto e sezioni statiche.
    """
    try:
        body = json.loads(event.get("body", "{}"))
        code = body.get("code")
        first_name = (body.get("firstName") or "").strip()
        last_name = (body.get("lastName") or "").strip()

        if not code or not first_name or not last_name:
            return json_response(400, {"error": "Richiesti codice, nome e cognome"})

        if not validate_photo_code(code):
            return json_response(401, {"error": "Codice di accesso non valido"})

        guest_name = f"{first_name} {last_name}"
        guest_id = str(uuid.uuid4())
        # Identificatore sintetico al posto del telefono: usato come chiave
        # per raggruppare le foto caricate da questo ospite.
        guest_key = f"photoguest:{guest_id}"

        expiry_days = int(os.getenv("TOKEN_EXPIRY_DAYS", "30"))
        table = dynamodb.Table("WeddingInvites")
        table.put_item(
            Item={
                "PK": f"PHOTOGUEST#{guest_id}",
                "guestName": guest_name,
                "phoneNumber": guest_key,
                "isAdmin": False,
                "isPhotoGuest": True,
                "expiresAt": int(time.time()) + (expiry_days * 86400),
                "createdAt": datetime.utcnow().isoformat(),
            }
        )

        jwt_token = generate_token(guest_key, guest_name, is_admin=False, is_photo_guest=True)

        return json_response(200, {
            "message": "Registrazione riuscita",
            "jwt": jwt_token,
            "guestName": guest_name,
            "isAdmin": False,
            "isPhotoGuest": True,
        })

    except Exception as e:
        print(f"Errore: {e}")
        return json_response(500, {"error": "Errore interno server"})

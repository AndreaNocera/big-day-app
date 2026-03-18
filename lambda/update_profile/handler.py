import json
import os
import sys
from datetime import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.aws_clients import dynamodb, send_email
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
            
        phone = payload.get("phone")
        guest_name = payload.get("name", "Ospite")
        
        body = json.loads(event.get("body", "{}"))
        email = body.get("email", "").strip()
        
        if not email:
            return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "Email mancante"})}
        
        table = dynamodb.Table("WeddingRSVP")
        
        # UpdateItem to add email securely associated with their phone context
        table.update_item(
            Key={"PK": f"GUEST#{phone}"},
            UpdateExpression="SET email = :e, updatedAt = :u",
            ExpressionAttributeValues={
                ":e": email,
                ":u": datetime.utcnow().isoformat()
            }
        )

        # Invia email di conferma multilingua
        subject = "Conferma Email / Email Confirmation / Confirmación de correo"
        body_html = f"""
        <html>
            <body style="font-family: sans-serif; color: #333; line-height: 1.5;">
                <div style="margin-bottom: 25px;">
                    <p>Ciao {guest_name}!</p>
                    <p>La tua mail è stata aggiunta.<br>
                    Se dovesse servire, ti invieremo a questo indirizzo tutti gli aggiornamenti.</p>
                    <p>Grazie,<br>Elisa ed Andrea</p>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <div style="margin-bottom: 25px;">
                    <p>¡Hola {guest_name}!</p>
                    <p>Tu correo ha sido añadido.<br>
                    Si fuera necesario, te enviaremos todas las actualizaciones a esta dirección.</p>
                    <p>Gracias,<br>Elisa y Andrea</p>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <div>
                    <p>Hi {guest_name}!</p>
                    <p>Your email has been added.<br>
                    If needed, we will send all updates to this address.</p>
                    <p>Thanks,<br>Elisa and Andrea</p>
                </div>
            </body>
        </html>
        """
        try:
            send_email(email, subject, body_html)
        except Exception as e:
            print(f"Errore invio email (non bloccante): {e}")
        
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({"message": "Profilo aggiornato con successo"})
        }
        
    except Exception as e:
        print(f"Errore: {e}")
        return {"statusCode": 500, "headers": cors_headers, "body": json.dumps({"error": "Errore interno server"})}

import os
import boto3

IS_LOCAL = os.getenv("ENV", "local") == "local"

DYNAMODB_CONFIG = dict(
    endpoint_url="http://dynamodb-local:8000" if IS_LOCAL else None,
    region_name=os.getenv("AWS_REGION", "eu-west-1"),
    aws_access_key_id="dummy" if IS_LOCAL else None,
    aws_secret_access_key="dummy" if IS_LOCAL else None,
)

S3_CONFIG = dict(
    endpoint_url="http://minio:9000" if IS_LOCAL else None,
    region_name=os.getenv("AWS_REGION", "eu-west-1"),
    aws_access_key_id=os.getenv("MINIO_ROOT_USER", "minioadmin") if IS_LOCAL else None,
    aws_secret_access_key=os.getenv("MINIO_ROOT_PASSWORD", "minioadmin") if IS_LOCAL else None,
)

dynamodb = boto3.resource("dynamodb", **DYNAMODB_CONFIG)
s3 = boto3.client("s3", **S3_CONFIG)

def send_sms(phone_number: str, message: str):
    if IS_LOCAL:
        print(f"[SMS MOCK] To: {phone_number} | Message: {message}")
    else:
        sns = boto3.client("sns", region_name=os.getenv("AWS_REGION", "eu-west-1"))
        sns.publish(
            PhoneNumber=phone_number, 
            Message=message,
            MessageAttributes={
                "AWS.SNS.SMS.SMSType": {
                    "DataType": "String", "StringValue": "Transactional"
                },
                "AWS.SNS.SMS.SenderID": {
                    "DataType": "String", "StringValue": os.getenv("SNS_SENDER_ID", "Matrimonio")
                }
            }
        )

def send_email(to: str, subject: str, body_html: str):
    if IS_LOCAL:
        import smtplib
        from email.mime.text import MIMEText
        print(f"[EMAIL MOCK] Tentativo di invio a: {to} | Oggetto: {subject}")
        try:
            msg = MIMEText(body_html, "html")
            msg["Subject"] = subject
            msg["From"] = os.getenv("MAILERSEND_FROM_EMAIL", "noreply@local.domain")
            msg["To"] = to
            
            # Nota: 'mailhog' è l'hostname nel network docker
            with smtplib.SMTP("mailhog", 1025) as server:
                server.sendmail(msg["From"], [to], msg.as_string())
            print(f"[EMAIL MOCK] Email inviata con successo a MailHog!")
        except Exception as e:
            print(f"[EMAIL MOCK] Errore critico invio SMTP: {e}")
            raise e
    else:
        import urllib.request
        import urllib.error
        import json
        
        api_key = os.getenv("MAILERSEND_API_KEY")
        from_email = os.getenv("MAILERSEND_FROM_EMAIL")
        
        if not api_key or not from_email:
            print("ERROR: MAILERSEND_API_KEY or MAILERSEND_FROM_EMAIL non configurati.")
            return

        url = "https://api.mailersend.com/v1/email"
        
        payload = {
            "from": {
                "email": from_email,
                "name": "A&E Matrimonio"
            },
            "to": [
                {
                    "email": to
                }
            ],
            "subject": subject,
            "html": body_html
        }
        
        data = json.dumps(payload).encode("utf-8")
        
        req = urllib.request.Request(url, data=data)
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")
        req.add_header("Authorization", f"Bearer {api_key}")
        # Use a more realistic browser-like User-Agent to avoid Cloudflare 1010 block
        req.add_header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
        
        try:
            response = urllib.request.urlopen(req)
            print(f"Mailersend response status: {response.getcode()}")
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            print(f"Errore HTTP Mailersend ({e.code}): {error_body}")
            raise e
        except Exception as e:
            print(f"Errore generico invio email con Mailersend: {e}")
            raise e


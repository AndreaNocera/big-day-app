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
        sns.publish(PhoneNumber=phone_number, Message=message,
            MessageAttributes={"AWS.SNS.SMS.SMSType": {
                "DataType": "String", "StringValue": "Transactional"
            }}
        )

def send_email(to: str, subject: str, body_html: str):
    if IS_LOCAL:
        import smtplib
        from email.mime.text import MIMEText
        msg = MIMEText(body_html, "html")
        msg["Subject"] = subject
        msg["From"] = os.getenv("SES_FROM_EMAIL", "noreply@local.domain")
        msg["To"] = to
        with smtplib.SMTP("mailhog", 1025) as server:
            server.sendmail(msg["From"], [to], msg.as_string())
    else:
        ses = boto3.client("ses", region_name=os.getenv("AWS_REGION", "eu-west-1"))
        ses.send_email(
            Source=os.getenv("SES_FROM_EMAIL"),
            Destination={"ToAddresses": [to]},
            Message={"Subject": {"Data": subject},
                     "Body": {"Html": {"Data": body_html}}}
        )

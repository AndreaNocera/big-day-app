import os
import jwt
from datetime import datetime, timedelta, timezone

def generate_token(phone: str, name: str) -> str:
    secret = os.getenv("JWT_SECRET", "local-dev-secret-change-in-prod")
    expiry_days = int(os.getenv("TOKEN_EXPIRY_DAYS", "30"))
    
    payload = {
        "phone": phone,
        "name": name,
        "exp": datetime.now(timezone.utc) + timedelta(days=expiry_days),
        "iat": datetime.now(timezone.utc)
    }
    
    return jwt.encode(payload, secret, algorithm="HS256")

def verify_token(token: str) -> dict:
    secret = os.getenv("JWT_SECRET", "local-dev-secret-change-in-prod")
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

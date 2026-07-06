"""Genera il link speciale per l'accesso alla funzionalita' Foto.

Crea un codice random da 256 bit, ne salva SOLO lo SHA-256 in DynamoDB
(tabella WeddingInvites, PK = PHOTOACCESS#<sha256>) e stampa il link
completo da condividere con gli invitati abilitati.

Uso:
    python scripts/generate_photo_link.py                # ambiente locale
    python scripts/generate_photo_link.py --prod         # AWS produzione
    python scripts/generate_photo_link.py --label "famiglia" --frontend-url https://www.example.com

Per revocare un codice: eliminare (o mettere active=False su) l'item
PHOTOACCESS#... in tabella e generarne uno nuovo.
"""
import argparse
import hashlib
import os
import secrets
from datetime import datetime

import boto3


def read_env_file_var(path: str, key: str):
    """Legge una variabile da un file .env (senza dipendenze esterne)."""
    if not os.path.exists(path):
        return None
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line.startswith(f"{key}="):
                return line.split("=", 1)[1].strip()
    return None


def main():
    parser = argparse.ArgumentParser(description="Genera un link di accesso foto")
    parser.add_argument("--prod", action="store_true", help="Salva su AWS produzione invece che su DynamoDB locale")
    parser.add_argument("--label", default="default", help="Etichetta descrittiva del codice")
    parser.add_argument("--frontend-url", default=None, help="URL base del frontend per comporre il link")
    args = parser.parse_args()

    if args.prod:
        dynamodb = boto3.resource("dynamodb", region_name="eu-west-1")
        # Il dominio di produzione non e' nel repo: viene risolto a runtime da
        # --frontend-url, dalla env VITE_PUBLIC_FRONTEND_URL o da .env.production (gitignorato).
        env_prod = os.path.join(os.path.dirname(__file__), "..", ".env.production")
        frontend_url = (
            args.frontend_url
            or os.getenv("VITE_PUBLIC_FRONTEND_URL")
            or read_env_file_var(env_prod, "VITE_PUBLIC_FRONTEND_URL")
        )
        if not frontend_url:
            raise SystemExit(
                "URL frontend di produzione non trovato: passa --frontend-url, "
                "oppure imposta VITE_PUBLIC_FRONTEND_URL (env o .env.production)."
            )
    else:
        dynamodb = boto3.resource(
            "dynamodb",
            endpoint_url="http://localhost:8001",  # Running locally from host
            region_name="eu-west-1",
            aws_access_key_id="dummy",
            aws_secret_access_key="dummy",
        )
        frontend_url = args.frontend_url or "http://localhost:5173"

    # 256 bit di entropia, url-safe (43 caratteri)
    code = secrets.token_urlsafe(32)
    code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()

    table = dynamodb.Table("WeddingInvites")
    table.put_item(
        Item={
            "PK": f"PHOTOACCESS#{code_hash}",
            "label": args.label,
            "active": True,
            "createdAt": datetime.now().isoformat(),
        }
    )

    print(f"Codice generato (label: {args.label})")
    print(f"Hash salvato a DB: PHOTOACCESS#{code_hash}")
    print()
    print("Link da condividere:")
    print(f"  {frontend_url}/photos-on?c={code}")
    print()
    print("NB: il codice in chiaro NON e' recuperabile dal DB. Conserva questo link.")


if __name__ == "__main__":
    main()

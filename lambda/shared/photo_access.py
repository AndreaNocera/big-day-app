import hashlib

from shared.aws_clients import dynamodb

# Prefisso PK degli item che rappresentano i codici di accesso foto.
# In tabella salviamo SOLO lo SHA-256 del codice: un dump del DB non rivela il link.
PHOTO_ACCESS_PREFIX = "PHOTOACCESS#"


def hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def validate_photo_code(code: str) -> bool:
    """Ritorna True se il codice esiste in WeddingInvites ed e' attivo."""
    if not code or len(code) < 16:
        return False
    table = dynamodb.Table("WeddingInvites")
    response = table.get_item(Key={"PK": f"{PHOTO_ACCESS_PREFIX}{hash_code(code)}"})
    item = response.get("Item")
    if not item:
        return False
    return bool(item.get("active", False))

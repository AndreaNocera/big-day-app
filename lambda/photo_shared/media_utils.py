import re
import unicodedata

from shared.media_utils import (
    ALLOWED_MEDIA_TYPES,
    IMAGE_EXTENSIONS,
    MAX_IMAGE_SIZE_BYTES,
    MAX_VIDEO_SIZE_BYTES,
    VIDEO_EXTENSIONS,
    get_max_media_size,
    get_media_config,
    infer_media_type,
    is_image_key,
)


MIN_PERSON_NAME_LENGTH = 2
MAX_PERSON_NAME_LENGTH = 60
_PERSON_NAME_RE = re.compile(r"^[^\W\d_]+(?:[ '\u2019-][^\W\d_]+)*$", re.UNICODE)
_RESERVED_PERSON_VALUES = {
    "password", "passwd", "pwd", "pin", "telefono", "telephone", "phone",
}


def normalize_person_name(value: str) -> str:
    """Valida una singola parte del nome di un photo guest."""
    normalized = " ".join(unicodedata.normalize("NFC", value or "").split())
    if not MIN_PERSON_NAME_LENGTH <= len(normalized) <= MAX_PERSON_NAME_LENGTH:
        raise ValueError("invalid name length")
    if not _PERSON_NAME_RE.fullmatch(normalized):
        raise ValueError("invalid name characters")
    comparable = normalized.casefold().replace("’", "'").strip(" '-")
    if comparable in _RESERVED_PERSON_VALUES:
        raise ValueError("reserved name value")
    return normalized


def slugify_uploader_name(value: str) -> str:
    """Crea il prefisso S3 leggibile senza accettare separatori di percorso."""
    decomposed = unicodedata.normalize("NFKD", value or "")
    parts = []
    pending_separator = False
    for char in decomposed:
        if unicodedata.combining(char):
            continue
        if char.isalnum():
            if pending_separator and parts:
                parts.append("-")
            parts.append(char.casefold())
            pending_separator = False
        else:
            pending_separator = True
    slug = "".join(parts).strip("-")[:80].rstrip("-")
    return slug or "ospite"


def validate_stored_object(item: dict, head: dict) -> str | None:
    """Restituisce un failureCode se MIME o dimensione non rispettano il record."""
    content_type = (head.get("ContentType") or "").lower()
    expected_content_type = (item.get("contentType") or "").lower()
    media_config = get_media_config(expected_content_type)
    if not media_config or content_type != expected_content_type:
        return "INVALID_CONTENT_TYPE"
    if int(head.get("ContentLength") or 0) > get_max_media_size(media_config["mediaType"]):
        return "FILE_TOO_LARGE"
    return None

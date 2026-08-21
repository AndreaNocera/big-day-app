"""Formati media condivisi dagli handler di upload, galleria e thumbnail."""

ALLOWED_MEDIA_TYPES = {
    "image/jpeg": {"extension": "jpg", "mediaType": "image"},
    "image/png": {"extension": "png", "mediaType": "image"},
    "image/webp": {"extension": "webp", "mediaType": "image"},
    "image/heic": {"extension": "heic", "mediaType": "image"},
    "image/heif": {"extension": "heif", "mediaType": "image"},
    "video/mp4": {"extension": "mp4", "mediaType": "video"},
    "video/quicktime": {"extension": "mov", "mediaType": "video"},
    "video/webm": {"extension": "webm", "mediaType": "video"},
}

IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "heic", "heif"}
VIDEO_EXTENSIONS = {"mp4", "mov", "webm"}

MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024
MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024


def get_media_config(content_type: str):
    return ALLOWED_MEDIA_TYPES.get((content_type or "").lower())


def get_max_media_size(media_type: str) -> int:
    return MAX_VIDEO_SIZE_BYTES if media_type == "video" else MAX_IMAGE_SIZE_BYTES


def infer_media_type(item: dict) -> str:
    """Legge i nuovi metadati e mantiene compatibili i record foto esistenti."""
    stored_type = item.get("mediaType")
    if stored_type in {"image", "video"}:
        return stored_type

    content_type = (item.get("contentType") or "").lower()
    if content_type.startswith("video/"):
        return "video"

    extension = (item.get("s3Key") or "").rsplit(".", 1)[-1].lower()
    if extension in VIDEO_EXTENSIONS:
        return "video"

    # Tutti i record storici sono immagini e non hanno mediaType/contentType.
    return "image"


def is_image_key(s3_key: str) -> bool:
    extension = (s3_key or "").rsplit(".", 1)[-1].lower()
    return extension in IMAGE_EXTENSIONS

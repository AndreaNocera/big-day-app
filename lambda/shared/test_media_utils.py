from shared.media_utils import get_media_config, infer_media_type, is_image_key


def test_supported_video_configuration():
    assert get_media_config("video/quicktime") == {
        "extension": "mov",
        "mediaType": "video",
    }


def test_media_inference_keeps_old_photos_compatible():
    assert infer_media_type({"s3Key": "uploads/legacy.jpg"}) == "image"
    assert infer_media_type({"s3Key": "uploads/new.mp4"}) == "video"
    assert infer_media_type({"mediaType": "video", "s3Key": "uploads/no-extension"}) == "video"


def test_thumbnail_filter_accepts_images_only():
    assert is_image_key("uploads/photo.webp") is True
    assert is_image_key("uploads/photo.heic") is True
    assert is_image_key("uploads/photo.heif") is True
    assert is_image_key("uploads/video.webm") is False

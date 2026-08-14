import os
import io

os.environ["ENV"] = "test"

from process_photo import handler as handler_module
from PIL import Image
from pillow_heif import register_heif_opener

register_heif_opener()


class FailIfCalledS3:
    def get_object(self, **kwargs):
        raise AssertionError(f"S3 non deve essere letto per un video: {kwargs}")


def test_video_is_skipped_before_thumbnail_processing(monkeypatch):
    monkeypatch.setattr(handler_module, "s3", FailIfCalledS3())
    event = {
        "Records": [{
            "s3": {
                "bucket": {"name": "test-bucket"},
                "object": {"key": "uploads/guest-video.mp4"}
            }
        }]
    }

    assert handler_module.handler(event, {}) is None


class FakeBody:
    def __init__(self, data):
        self.data = data

    def read(self):
        return self.data


class RecordingS3:
    def __init__(self, original):
        self.original = original
        self.upload = None

    def get_object(self, **kwargs):
        return {"Body": FakeBody(self.original)}

    def put_object(self, **kwargs):
        self.upload = kwargs


class FakeTable:
    def __init__(self):
        self.update = None

    def query(self, **kwargs):
        return {"Items": [{"PK": "PHOTO#heic-test"}]}

    def update_item(self, **kwargs):
        self.update = kwargs


class FakeDynamoDB:
    def __init__(self):
        self.table = FakeTable()

    def Table(self, name):
        assert name == "WeddingPhotos"
        return self.table


def test_heic_generates_browser_compatible_jpeg_thumbnail(monkeypatch):
    source = io.BytesIO()
    Image.new("RGB", (20, 10), color="red").save(source, format="HEIF")

    fake_s3 = RecordingS3(source.getvalue())
    fake_dynamodb = FakeDynamoDB()
    monkeypatch.setattr(handler_module, "s3", fake_s3)
    monkeypatch.setattr(handler_module, "dynamodb", fake_dynamodb)

    event = {
        "Records": [{
            "s3": {
                "bucket": {"name": "test-bucket"},
                "object": {"key": "uploads/guest-photo.heic"}
            }
        }]
    }

    assert handler_module.handler(event, {}) is None
    assert fake_s3.upload["Key"] == "thumbnails/guest-photo.jpg"
    assert fake_s3.upload["ContentType"] == "image/jpeg"
    assert fake_dynamodb.table.update["ExpressionAttributeValues"][":tk"] == "thumbnails/guest-photo.jpg"

    thumbnail = Image.open(io.BytesIO(fake_s3.upload["Body"].getvalue()))
    assert thumbnail.format == "JPEG"
    assert thumbnail.size == (20, 10)

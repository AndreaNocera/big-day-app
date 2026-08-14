import json
import os

os.environ["ENV"] = "test"

from get_photos import handler as handler_module


class FakeTable:
    def __init__(self, items):
        self.items = items

    def scan(self, **kwargs):
        return {"Items": self.items}


class FakeDynamoDB:
    def __init__(self, items):
        self.table = FakeTable(items)

    def Table(self, name):
        assert name == "WeddingPhotos"
        return self.table


class RecordingS3:
    def __init__(self):
        self.requested_keys = []

    def generate_presigned_url(self, operation, Params, ExpiresIn):
        assert operation == "get_object"
        assert ExpiresIn == 3600
        self.requested_keys.append(Params["Key"])
        return f"https://signed.invalid/{Params['Key']}"


def test_regular_gallery_exposes_only_thumbnails_and_video_placeholders(monkeypatch):
    items = [
        {
            "PK": "PHOTO#image-ready",
            "uploadedBy": "guest-1",
            "uploadedAt": "2026-08-14T12:00:00+00:00",
            "s3Key": "uploads/original.jpg",
            "thumbKey": "thumbnails/original.jpg",
            "mediaType": "image",
            "contentType": "image/jpeg",
        },
        {
            "PK": "PHOTO#video",
            "uploadedBy": "guest-1",
            "uploadedAt": "2026-08-14T11:00:00+00:00",
            "s3Key": "uploads/original.mp4",
            "mediaType": "video",
            "contentType": "video/mp4",
        },
        {
            "PK": "PHOTO#image-processing",
            "uploadedBy": "guest-1",
            "uploadedAt": "2026-08-14T10:00:00+00:00",
            "s3Key": "uploads/not-ready.jpg",
            "mediaType": "image",
            "contentType": "image/jpeg",
        },
    ]
    fake_s3 = RecordingS3()
    monkeypatch.setattr(handler_module, "dynamodb", FakeDynamoDB(items))
    monkeypatch.setattr(handler_module, "s3", fake_s3)
    monkeypatch.setattr(handler_module, "verify_token", lambda _token: {"phone": "guest-1"})

    response = handler_module.handler(
        {"headers": {"Authorization": "Bearer valid-test-token"}},
        {},
    )

    assert response["statusCode"] == 200
    photos = json.loads(response["body"])["photos"]
    assert [photo["PK"] for photo in photos] == ["PHOTO#image-ready", "PHOTO#video"]

    image = photos[0]
    assert image["url"].endswith("thumbnails/original.jpg")
    assert "originalUrl" not in image
    assert "s3Key" not in image

    video = photos[1]
    assert video["mediaType"] == "video"
    assert "url" not in video
    assert "originalUrl" not in video
    assert "s3Key" not in video

    assert fake_s3.requested_keys == ["thumbnails/original.jpg"]

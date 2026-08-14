import json
import os

os.environ["ENV"] = "test"

from admin_get_photos import handler as handler_module


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


def test_admin_list_loads_image_urls_but_not_video_urls(monkeypatch):
    items = [
        {
            "PK": "PHOTO#image",
            "uploadedBy": "guest-1",
            "uploaderName": "Test Guest",
            "uploadedAt": "2026-08-14T12:00:00+00:00",
            "s3Key": "uploads/photo.jpg",
            "thumbKey": "thumbnails/photo.jpg",
            "mediaType": "image",
        },
        {
            "PK": "PHOTO#video",
            "uploadedBy": "guest-1",
            "uploaderName": "Test Guest",
            "uploadedAt": "2026-08-14T11:00:00+00:00",
            "s3Key": "uploads/video.mp4",
            "mediaType": "video",
        },
    ]
    fake_s3 = RecordingS3()
    monkeypatch.setattr(handler_module, "dynamodb", FakeDynamoDB(items))
    monkeypatch.setattr(handler_module, "s3", fake_s3)
    monkeypatch.setattr(handler_module, "verify_token", lambda _token: {"isAdmin": True})

    response = handler_module.handler(
        {"headers": {"Authorization": "Bearer valid-test-token"}},
        {},
    )

    assert response["statusCode"] == 200
    photos = json.loads(response["body"])["guests"][0]["photos"]
    image, video = photos

    assert image["thumbUrl"].endswith("thumbnails/photo.jpg")
    assert image["originalUrl"].endswith("uploads/photo.jpg")
    assert "thumbUrl" not in video
    assert "originalUrl" not in video
    assert fake_s3.requested_keys == ["thumbnails/photo.jpg", "uploads/photo.jpg"]

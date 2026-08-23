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


def test_admin_list_returns_only_received_media_and_no_video_urls(monkeypatch):
    items = [
        {
            "PK": "PHOTO#heic-ready",
            "uploadedBy": "guest-1",
            "uploaderName": "Test Guest",
            "uploadedAt": "2026-08-14T12:00:00+00:00",
            "s3Key": "uploads/photo.heic",
            "thumbKey": "thumbnails/photo.jpg",
            "mediaType": "image",
            "contentType": "image/heic",
            "uploadStatus": "completed",
            "processingStatus": "completed",
        },
        {
            "PK": "PHOTO#new-pending",
            "uploadedBy": "guest-1",
            "uploaderName": "Test Guest",
            "uploadedAt": "2026-08-14T11:45:00+00:00",
            "s3Key": "uploads/new-pending.jpg",
            "mediaType": "image",
            "uploadStatus": "pending",
            "processingStatus": "pending",
        },
        {
            "PK": "PHOTO#heic-pending",
            "uploadedBy": "guest-1",
            "uploaderName": "Test Guest",
            "uploadedAt": "2026-08-14T11:30:00+00:00",
            "s3Key": "uploads/pending.heic",
            "mediaType": "image",
            "contentType": "image/heic",
            "uploadStatus": "completed",
            "processingStatus": "pending",
        },
        {
            "PK": "PHOTO#video",
            "uploadedBy": "guest-1",
            "uploaderName": "Test Guest",
            "uploadedAt": "2026-08-14T11:00:00+00:00",
            "s3Key": "uploads/video.mp4",
            "mediaType": "video",
            "uploadStatus": "completed",
            "processingStatus": "not_required",
        },
        {
            "PK": "PHOTO#processing-failed",
            "uploadedBy": "guest-1",
            "uploaderName": "Test Guest",
            "uploadedAt": "2026-08-14T10:45:00+00:00",
            "s3Key": "uploads/processing-failed.jpg",
            "mediaType": "image",
            "uploadStatus": "completed",
            "processingStatus": "failed",
            "failureCode": "THUMBNAIL_PROCESSING_FAILED",
        },
        {
            "PK": "PHOTO#deleted",
            "uploadedBy": "guest-1",
            "uploaderName": "Test Guest",
            "uploadedAt": "2026-08-14T10:30:00+00:00",
            "s3Key": "uploads/deleted.jpg",
            "thumbKey": "thumbnails/deleted.jpg",
            "mediaType": "image",
            "deletedAt": "2026-08-14T10:45:00+00:00",
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
    photos_by_pk = {photo["PK"]: photo for photo in photos}
    ready_image = photos_by_pk["PHOTO#heic-ready"]
    pending_image = photos_by_pk["PHOTO#heic-pending"]
    video = photos_by_pk["PHOTO#video"]

    assert ready_image["thumbUrl"].endswith("thumbnails/photo.jpg")
    assert "originalUrl" not in ready_image
    assert set(photos_by_pk) == {
        "PHOTO#heic-ready",
        "PHOTO#heic-pending",
        "PHOTO#video",
        "PHOTO#processing-failed",
    }
    assert pending_image["uploadStatus"] == "completed"
    assert pending_image["processingStatus"] == "pending"
    assert photos_by_pk["PHOTO#processing-failed"]["failureCode"] == "THUMBNAIL_PROCESSING_FAILED"
    assert "thumbUrl" not in pending_image
    assert "originalUrl" not in pending_image
    assert "thumbUrl" not in video
    assert "originalUrl" not in video
    assert fake_s3.requested_keys == ["thumbnails/photo.jpg"]


def test_admin_list_excludes_failed_upload_attempts(monkeypatch):
    items = [
        {
            "PK": "PHOTO#pending",
            "uploadedBy": "guest-1",
            "uploaderName": "Test Guest",
            "uploadedAt": "2026-08-14T12:00:00+00:00",
            "mediaType": "video",
            "uploadStatus": "pending",
            "processingStatus": "pending",
        },
        {
            "PK": "PHOTO#cleaning",
            "uploadedBy": "guest-1",
            "uploaderName": "Test Guest",
            "uploadedAt": "2026-08-14T11:55:00+00:00",
            "mediaType": "video",
            "uploadStatus": "cleaning",
            "processingStatus": "failed",
        },
        {
            "PK": "PHOTO#failed",
            "uploadedBy": "guest-1",
            "uploaderName": "Test Guest",
            "uploadedAt": "2026-08-14T11:50:00+00:00",
            "mediaType": "image",
            "uploadStatus": "failed",
            "processingStatus": "failed",
            "failureCode": "UPLOAD_NOT_RECEIVED",
            "failedAt": 1786708800,
        },
    ]
    monkeypatch.setattr(handler_module, "dynamodb", FakeDynamoDB(items))
    monkeypatch.setattr(handler_module, "s3", RecordingS3())
    monkeypatch.setattr(handler_module, "verify_token", lambda _token: {"isAdmin": True})

    response = handler_module.handler(
        {"headers": {"Authorization": "Bearer valid-test-token"}},
        {},
    )

    assert response["statusCode"] == 200
    assert json.loads(response["body"])["guests"] == []

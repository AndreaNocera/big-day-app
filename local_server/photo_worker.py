"""Worker locale SQS con la stessa semantica batch-size-1 della Lambda."""

import os
import sys
import time

from botocore.exceptions import ClientError

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "lambda"))
from process_photo.handler import handler as process_photo_handler
from photo_shared.aws_clients import sqs


def run():
    queue_url = os.environ["PHOTO_PROCESSING_QUEUE_URL"]
    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=queue_url,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=20,
                AttributeNames=["ApproximateReceiveCount"],
                VisibilityTimeout=120,
            )
        except ClientError as exc:
            print(f"Local photo worker waiting for queue: {type(exc).__name__}")
            time.sleep(2)
            continue
        for message in response.get("Messages", []):
            event = {
                "Records": [{
                    "body": message["Body"],
                    "attributes": message.get("Attributes", {}),
                }]
            }
            try:
                process_photo_handler(event, {})
            except Exception as exc:
                print(f"Local photo worker retry: {type(exc).__name__}")
                continue
            sqs.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=message["ReceiptHandle"],
            )


if __name__ == "__main__":
    run()

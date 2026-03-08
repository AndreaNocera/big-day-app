import json
import os
import sys
import io
from datetime import datetime

# Add lambda path so shared components can be imported
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.aws_clients import s3, dynamodb

try:
    from PIL import Image
except Exception as e:
    import traceback
    print(f"Error importing PIL: {e}")
    traceback.print_exc()
    Image = None

def handler(event, context):
    """
    Triggered by S3 ObjectCreated event.
    Generates a thumbnail and updates DynamoDB.
    """
    try:
        # Get bucket and key from the S3 event
        record = event['Records'][0]
        bucket_name = record['s3']['bucket']['name']
        s3_key = record['s3']['object']['key']
        
        # Skip if it's already a thumbnail or not an upload
        if not s3_key.startswith("uploads/") or "thumbnails/" in s3_key:
            print(f"Skipping key: {s3_key}")
            return
            
        print(f"Processing photo: {bucket_name}/{s3_key}")
        
        # 1. Download original image
        response = s3.get_object(Bucket=bucket_name, Key=s3_key)
        image_content = response['Body'].read()
        
        if not Image:
            print("Pillow not available, skipping resize.")
            return

        # 2. Generate Thumbnail
        img = Image.open(io.BytesIO(image_content))
        
        # Maintain aspect ratio
        thumb_size = (300, 300)
        img.thumbnail(thumb_size)
        
        # Save to buffer
        buffer = io.BytesIO()
        ext = s3_key.split(".")[-1].upper()
        # Map extension to PIL format
        fmt = "JPEG" if ext in ["JPG", "JPEG"] else ext
        img.save(buffer, format=fmt)
        buffer.seek(0)
        
        # 3. Upload Thumbnail
        thumb_key = s3_key.replace("uploads/", "thumbnails/")
        s3.put_object(
            Bucket=bucket_name,
            Key=thumb_key,
            Body=buffer,
            ContentType=f"image/{fmt.lower()}"
        )
        print(f"Thumbnail uploaded: {thumb_key}")
        
        # 4. Update DynamoDB
        # We need to find the item by s3Key. 
        # Since s3Key is not our primary key, we scan (in local/small scale) 
        # or we could use GSI if we had one.
        table = dynamodb.Table("WeddingPhotos")
        query_response = table.query(
            IndexName="S3KeyIndex",
            KeyConditionExpression="s3Key = :key",
            ExpressionAttributeValues={":key": s3_key}
        )
        
        items = query_response.get("Items", [])
        if items:
            pk = items[0]["PK"]
            table.update_item(
                Key={"PK": pk},
                UpdateExpression="SET thumbKey = :tk, approved = :app",
                ExpressionAttributeValues={
                    ":tk": thumb_key,
                    ":app": True # Auto-approve for now since it's processed
                }
            )
            print(f"DynamoDB updated for PK: {pk}")
        else:
            print(f"No DynamoDB item found for s3Key: {s3_key}")

    except Exception as e:
        print(f"Error processing photo: {e}")
        raise e

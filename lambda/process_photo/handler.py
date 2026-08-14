import json
import os
import sys
import io
from botocore.exceptions import ClientError

# Add lambda path so shared components can be imported
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.aws_clients import s3, dynamodb
from shared.media_utils import is_image_key

try:
    from PIL import Image, ImageOps
except Exception as e:
    import traceback
    print(f"Error importing PIL: {e}")
    traceback.print_exc()
    Image = None
    ImageOps = None

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except Exception as e:
    print(f"Error enabling HEIC/HEIF support: {e}")

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

        # I video restano originali: il processore thumbnail usa Pillow solo per immagini.
        if not is_image_key(s3_key):
            print(f"Skipping non-image media: {s3_key}")
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
        img = ImageOps.exif_transpose(img)
        
        # Maintain aspect ratio
        thumb_size = (300, 300)
        img.thumbnail(thumb_size)
        
        # Save to buffer
        buffer = io.BytesIO()
        ext = s3_key.rsplit(".", 1)[-1].upper()
        # Map extension to PIL format
        fmt = "JPEG" if ext in ["JPG", "JPEG", "HEIC", "HEIF"] else ext
        if fmt == "JPEG" and img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        save_options = {"quality": 85, "optimize": True} if fmt == "JPEG" else {}
        img.save(buffer, format=fmt, **save_options)
        buffer.seek(0)
        
        # 3. Upload Thumbnail
        thumb_key = s3_key.replace("uploads/", "thumbnails/")
        if ext in ["HEIC", "HEIF"]:
            thumb_key = thumb_key.rsplit(".", 1)[0] + ".jpg"
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
            try:
                table.update_item(
                    Key={"PK": pk},
                    UpdateExpression="SET thumbKey = :tk, approved = :app",
                    ExpressionAttributeValues={
                        ":tk": thumb_key,
                        ":app": True # Auto-approve for now since it's processed
                    },
                    ConditionExpression="attribute_exists(PK) AND attribute_not_exists(deletedAt)",
                )
                print(f"DynamoDB updated for PK: {pk}")
            except ClientError as exc:
                if exc.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
                    raise
                # Il media e' stato eliminato mentre la thumbnail era in
                # elaborazione: rimuoviamo l'asset appena generato e non
                # ricreiamo un record parziale.
                s3.delete_object(Bucket=bucket_name, Key=thumb_key)
                print("Thumbnail rimossa per media eliminato durante l'elaborazione")
        else:
            print(f"No DynamoDB item found for s3Key: {s3_key}")

    except Exception as e:
        print(f"Error processing photo: {e}")
        raise e

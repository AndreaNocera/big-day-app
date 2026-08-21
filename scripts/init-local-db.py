import json
import boto3
import time
from botocore.exceptions import ClientError


def wait_for_table_indexes(dynamodb, table_name):
    while True:
        table = dynamodb.describe_table(TableName=table_name)["Table"]
        indexes = table.get("GlobalSecondaryIndexes", [])
        if table["TableStatus"] == "ACTIVE" and all(
            index["IndexStatus"] == "ACTIVE" for index in indexes
        ):
            return table
        time.sleep(0.25)


def migrate_local_photo_indexes(dynamodb):
    """Allinea una tabella locale esistente senza cancellarne i record."""
    table = wait_for_table_indexes(dynamodb, "WeddingPhotos")
    index_names = {index["IndexName"] for index in table.get("GlobalSecondaryIndexes", [])}
    if "S3KeyIndex" in index_names:
        dynamodb.update_table(
            TableName="WeddingPhotos",
            GlobalSecondaryIndexUpdates=[{"Delete": {"IndexName": "S3KeyIndex"}}],
        )
        table = wait_for_table_indexes(dynamodb, "WeddingPhotos")
        index_names = {index["IndexName"] for index in table.get("GlobalSecondaryIndexes", [])}
        print("Indice locale S3KeyIndex rimosso.")

    if "UploadedByIndex" not in index_names:
        dynamodb.update_table(
            TableName="WeddingPhotos",
            AttributeDefinitions=[
                {"AttributeName": "uploadedBy", "AttributeType": "S"},
                {"AttributeName": "uploadedAt", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexUpdates=[{
                "Create": {
                    "IndexName": "UploadedByIndex",
                    "KeySchema": [
                        {"AttributeName": "uploadedBy", "KeyType": "HASH"},
                        {"AttributeName": "uploadedAt", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                }
            }],
        )
        wait_for_table_indexes(dynamodb, "WeddingPhotos")
        print("Indice locale UploadedByIndex creato.")

def init_db():
    print("Inizializzazione risorse locali...")
    
    # DynamoDB Local
    dynamodb = boto3.client(
        "dynamodb",
        endpoint_url="http://dynamodb-local:8000",
        region_name="eu-west-1",
        aws_access_key_id="dummy",
        aws_secret_access_key="dummy"
    )
    
    # Tables to create
    tables = [
        {
            "TableName": "WeddingInvites",
            "KeySchema": [{"AttributeName": "PK", "KeyType": "HASH"}],
            "AttributeDefinitions": [{"AttributeName": "PK", "AttributeType": "S"}],
            "BillingMode": "PAY_PER_REQUEST"
        },
        {
            "TableName": "WeddingRSVP",
            "KeySchema": [{"AttributeName": "PK", "KeyType": "HASH"}],
            "AttributeDefinitions": [{"AttributeName": "PK", "AttributeType": "S"}],
            "BillingMode": "PAY_PER_REQUEST"
        },
        {
            "TableName": "WeddingPhotos",
            "KeySchema": [{"AttributeName": "PK", "KeyType": "HASH"}],
            "AttributeDefinitions": [
                {"AttributeName": "PK", "AttributeType": "S"},
                {"AttributeName": "uploadedBy", "AttributeType": "S"},
                {"AttributeName": "uploadedAt", "AttributeType": "S"}
            ],
            "BillingMode": "PAY_PER_REQUEST",
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "UploadedByIndex",
                    "KeySchema": [
                        {"AttributeName": "uploadedBy", "KeyType": "HASH"},
                        {"AttributeName": "uploadedAt", "KeyType": "RANGE"}
                    ],
                    "Projection": {"ProjectionType": "ALL"}
                }
            ]
        }
    ]
    
    for table in tables:
        try:
            dynamodb.create_table(**table)
            print(f"Tabella {table['TableName']} creata.")
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceInUseException':
                print(f"Tabella {table['TableName']} già esistente.")
            else:
                raise e

    migrate_local_photo_indexes(dynamodb)
                
    # Enable TTL on WeddingInvites
    try:
        dynamodb.update_time_to_live(
            TableName="WeddingInvites",
            TimeToLiveSpecification={
                "Enabled": True,
                "AttributeName": "expiresAt"
            }
        )
        print("TTL abilitato su WeddingInvites.")
    except ClientError as e:
        print(f"Errore abilitazione TTL: {e}")

    # LocalStack S3 + SQS
    s3 = boto3.client(
        "s3",
        endpoint_url="http://localstack:4566",
        region_name="eu-west-1",
        aws_access_key_id="dummy",
        aws_secret_access_key="dummy"
    )
    sqs = boto3.client(
        "sqs",
        endpoint_url="http://localstack:4566",
        region_name="eu-west-1",
        aws_access_key_id="dummy",
        aws_secret_access_key="dummy"
    )

    dlq_url = sqs.create_queue(
        QueueName="photo-processing-dlq",
        Attributes={"MessageRetentionPeriod": "1209600"},
    )["QueueUrl"]
    dlq_arn = sqs.get_queue_attributes(
        QueueUrl=dlq_url,
        AttributeNames=["QueueArn"],
    )["Attributes"]["QueueArn"]
    queue_url = sqs.create_queue(
        QueueName="photo-processing",
        Attributes={
            "MessageRetentionPeriod": "345600",
            "VisibilityTimeout": "120",
            "RedrivePolicy": json.dumps({
                "deadLetterTargetArn": dlq_arn,
                "maxReceiveCount": "5",
            }),
        },
    )["QueueUrl"]
    queue_arn = sqs.get_queue_attributes(
        QueueUrl=queue_url,
        AttributeNames=["QueueArn"],
    )["Attributes"]["QueueArn"]
    sqs.set_queue_attributes(
        QueueUrl=queue_url,
        Attributes={
            "Policy": json.dumps({
                "Version": "2012-10-17",
                "Statement": [{
                    "Effect": "Allow",
                    "Principal": {"Service": "s3.amazonaws.com"},
                    "Action": "sqs:SendMessage",
                    "Resource": queue_arn,
                    "Condition": {
                        "ArnEquals": {
                            "aws:SourceArn": "arn:aws:s3:::wedding-photos-local"
                        },
                        "StringEquals": {"aws:SourceAccount": "000000000000"},
                    },
                }],
            })
        },
    )
    
    bucket_name = "wedding-photos-local"
    try:
        s3.create_bucket(
            Bucket=bucket_name,
            CreateBucketConfiguration={'LocationConstraint': 'eu-west-1'}
        )
        print(f"Bucket {bucket_name} creato.")
    except ClientError as e:
        if e.response['Error']['Code'] in ['BucketAlreadyExists', 'BucketAlreadyOwnedByYou']:
            print(f"Bucket {bucket_name} già esistente.")
        else:
            raise e
            
    # Set CORS on bucket
    cors_configuration = {
        'CORSRules': [{
            'AllowedHeaders': ['*'],
            'AllowedMethods': ['PUT', 'POST', 'DELETE', 'GET'],
            'AllowedOrigins': ['*'],
            'ExposeHeaders': ['ETag']
        }]
    }
    
    try:
        s3.put_bucket_cors(
            Bucket=bucket_name,
            CORSConfiguration=cors_configuration
        )
        print("CORS policy configurata sul bucket.")
    except ClientError as e:
        print(f"Nota: configurazione CORS locale non disponibile: {type(e).__name__}")

    s3.put_bucket_notification_configuration(
        Bucket=bucket_name,
        NotificationConfiguration={
            "QueueConfigurations": [{
                "QueueArn": queue_arn,
                "Events": ["s3:ObjectCreated:*"],
                "Filter": {
                    "Key": {
                        "FilterRules": [{"Name": "prefix", "Value": "uploads/"}]
                    }
                },
            }]
        },
    )
    print("Coda, DLQ e notifica S3 locali configurate.")
    
    print("Risorse locali pronte!")

if __name__ == "__main__":
    time.sleep(5)  # Wait for services to be ready
    init_db()

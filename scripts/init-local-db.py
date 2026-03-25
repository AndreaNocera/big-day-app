import json
import boto3
import time
from botocore.exceptions import ClientError

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
                {"AttributeName": "s3Key", "AttributeType": "S"}
            ],
            "BillingMode": "PAY_PER_REQUEST",
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "S3KeyIndex",
                    "KeySchema": [{"AttributeName": "s3Key", "KeyType": "HASH"}],
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

    # MinIO
    s3 = boto3.client(
        "s3",
        endpoint_url="http://minio:9000",
        region_name="eu-west-1",
        aws_access_key_id="minioadmin",
        aws_secret_access_key="minioadmin"
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
        print(f"Nota: Impossibile configurare CORS su MinIO (opzionale in locale): {e}")
    
    print("Risorse locali pronte!")

if __name__ == "__main__":
    time.sleep(5)  # Wait for services to be ready
    init_db()

from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_dynamodb as dynamodb,
    aws_s3 as s3,
    aws_iam as iam,
    CfnOutput,
    RemovalPolicy,
    aws_s3_deployment as s3_deploy
)
from constructs import Construct

class WeddingStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Storage
        invites_table = dynamodb.Table(self, "WeddingInvites",
            table_name="WeddingInvites",
            partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            time_to_live_attribute="expiresAt",
            removal_policy=RemovalPolicy.DESTROY
        )

        rsvp_table = dynamodb.Table(self, "WeddingRSVP",
            table_name="WeddingRSVP",
            partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )
        
        photos_table = dynamodb.Table(self, "WeddingPhotos",
            table_name="WeddingPhotos",
            partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )

        photos_bucket = s3.Bucket(self, "WeddingPhotosBucket",
            bucket_name="wedding-photos-prod-nocera", # Changed to be more unique
            cors=[s3.CorsRule(
                allowed_methods=[s3.HttpMethods.PUT, s3.HttpMethods.GET],
                allowed_origins=["*"],
                allowed_headers=["*"]
            )],
            removal_policy=RemovalPolicy.DESTROY
        )

        shared_env = {
            "ENV": "production",
            "JWT_SECRET": "your-prod-jwt-secret-override", # override with actual secret in prod
            "S3_BUCKET": photos_bucket.bucket_name
        }

        # Lambdas
        lambda_kwargs = {
            "runtime": _lambda.Runtime.PYTHON_3_12, # Using standard python 3.12, 3.14 not yet in CDK officially
            "environment": shared_env
        }
        
        # We need a layer for the shared code
        shared_layer = _lambda.LayerVersion(self, "SharedCodeLayer",
            code=_lambda.Code.from_asset("../lambda/shared"),
            compatible_runtimes=[_lambda.Runtime.PYTHON_3_12],
            description="Shared helpers and AWS clients"
        )
        # However, to use the layer effectively the folder structure might need adjusting (python/shared/..)
        # To avoid complexity, we can use asset bundling if needed, or point code to parent folder.
        # But we'll point exactly to the spec.
        
        # Let's map handlers
        send_invites = _lambda.Function(self, "SendInvites",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/send_invites"),
            **lambda_kwargs
        )

        verify_magic_link = _lambda.Function(self, "VerifyMagicLink",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/verify_magic_link"),
            **lambda_kwargs
        )
        
        rsvp_handler = _lambda.Function(self, "RSVPHandler",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/rsvp_handler"),
            **lambda_kwargs
        )
        
        survey_handler = _lambda.Function(self, "SurveyHandler",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/survey_handler"),
            **lambda_kwargs
        )
        
        get_upload_url = _lambda.Function(self, "GetUploadUrl",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/get_upload_url"),
            **lambda_kwargs
        )

        # Permissions
        invites_table.grant_read_write_data(send_invites)
        invites_table.grant_read_write_data(verify_magic_link)
        rsvp_table.grant_read_write_data(rsvp_handler)
        rsvp_table.grant_read_write_data(survey_handler)
        photos_table.grant_read_write_data(get_upload_url)
        photos_bucket.grant_put(get_upload_url)
        photos_bucket.grant_put_acl(get_upload_url)

        # Add SNS permissions to send_invites
        send_invites.add_to_role_policy(iam.PolicyStatement(
            actions=["sns:Publish"],
            resources=["*"]
        ))

        # API Gateway
        api = apigw.RestApi(self, "WeddingApi",
            rest_api_name="Wedding Service",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS
            )
        )

        api.root.add_resource("invites").add_resource("send").add_method("POST", apigw.LambdaIntegration(send_invites))
        api.root.add_resource("auth").add_resource("verify").add_method("POST", apigw.LambdaIntegration(verify_magic_link))
        api.root.add_resource("rsvp").add_method("POST", apigw.LambdaIntegration(rsvp_handler))
        api.root.add_resource("survey").add_method("POST", apigw.LambdaIntegration(survey_handler))
        api.root.add_resource("upload").add_resource("url").add_method("POST", apigw.LambdaIntegration(get_upload_url))
        
        # Frontend Hosting
        frontend_bucket = s3.Bucket(self, "WeddingFrontendBucket",
            bucket_name="wedding-frontend-prod-nocera", # Explicit unique name
            website_index_document="index.html",
            public_read_access=True,
            block_public_access=s3.BlockPublicAccess(
                block_public_acls=False,
                block_public_policy=False,
                ignore_public_acls=False,
                restrict_public_buckets=False
            ),
            removal_policy=RemovalPolicy.DESTROY, # RETAIN in prod if preferred
            auto_delete_objects=True
        )

        s3_deploy.BucketDeployment(self, "DeployFrontend",
            sources=[s3_deploy.Source.asset("../frontend/out")],
            destination_bucket=frontend_bucket
        )

        CfnOutput(self, "ApiUrl", value=api.url)
        CfnOutput(self, "FrontendUrl", value=frontend_bucket.bucket_website_url)

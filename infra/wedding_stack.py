import os
from dotenv import load_dotenv
from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_dynamodb as dynamodb,
    aws_s3 as s3,
    aws_iam as iam,
    CfnOutput,
    RemovalPolicy,
    aws_s3_deployment as s3_deploy,
    IAspect,
    Aspects
)
from constructs import Construct, IConstruct
import jsii
@jsii.implements(IAspect)
class LambdaRuntimeAspect:
    def visit(self, node: IConstruct) -> None:
        # 1. Handle direct CfnFunction
        if isinstance(node, _lambda.CfnFunction):
            if node.runtime and "nodejs" in str(node.runtime) and "nodejs24.x" not in str(node.runtime):
                node.runtime = "nodejs24.x"
        
        # 2. Handle constructs with a default child that might be a CfnFunction
        elif hasattr(node, "node") and node.node.default_child:
            child = node.node.default_child
            if isinstance(child, _lambda.CfnFunction):
                if child.runtime and "nodejs" in str(child.runtime) and "nodejs24.x" not in str(child.runtime):
                    child.runtime = "nodejs24.x"
        
        # 3. Handle Generic Custom Resource Providers or other wrappers
        elif hasattr(node, "runtime") and node.runtime:
             try:
                 r = str(node.runtime)
                 if "nodejs" in r and "nodejs24.x" not in r:
                     for c in node.node.find_all():
                         if isinstance(c, _lambda.CfnFunction):
                             c.runtime = "nodejs24.x"
             except:
                 pass

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

        # Environment variables from .env.production
        env_path = os.path.join(os.path.dirname(__file__), "..", ".env.production")
        load_dotenv(env_path)

        shared_env = {
            "ENV": "production",
            "JWT_SECRET": os.getenv("JWT_SECRET", "change-me-in-prod"),
            "S3_BUCKET": photos_bucket.bucket_name,
            "SES_FROM_EMAIL": os.getenv("SES_FROM_EMAIL", "noreply@yourdomain.com"),
            "SNS_SENDER_ID": os.getenv("SNS_SENDER_ID", "Matrimonio"),
            "TOKEN_EXPIRY_DAYS": os.getenv("TOKEN_EXPIRY_DAYS", "30")
        }

        # Shared Layer for code (must be in python/shared structure)
        shared_layer = _lambda.LayerVersion(self, "SharedCodeLayer",
            code=_lambda.Code.from_asset("../lambda/layer"),
            compatible_runtimes=[_lambda.Runtime.PYTHON_3_12],
            description="Shared helpers and AWS clients"
        )

        # Lambdas
        lambda_kwargs = {
            "runtime": _lambda.Runtime.PYTHON_3_12, 
            "environment": shared_env,
            "layers": [shared_layer]
        }
        
        # (Shared layer moved above)
        
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

        get_photos = _lambda.Function(self, "GetPhotos",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/get_photos"),
            **lambda_kwargs
        )

        update_profile = _lambda.Function(self, "UpdateProfile",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/update_profile"),
            **lambda_kwargs
        )

        # Permissions
        invites_table.grant_read_write_data(send_invites)
        invites_table.grant_read_write_data(verify_magic_link)
        rsvp_table.grant_read_write_data(rsvp_handler)
        rsvp_table.grant_read_write_data(survey_handler)
        rsvp_table.grant_read_write_data(update_profile)
        photos_table.grant_read_write_data(get_upload_url)
        photos_table.grant_read_data(get_photos)
        photos_bucket.grant_put(get_upload_url)
        photos_bucket.grant_put_acl(get_upload_url)
        photos_bucket.grant_read(get_photos)

        # Add SNS permissions to send_invites
        send_invites.add_to_role_policy(iam.PolicyStatement(
            actions=["sns:Publish"],
            resources=["*"]
        ))

        # Add SES permissions to update_profile
        update_profile.add_to_role_policy(iam.PolicyStatement(
            actions=["ses:SendEmail", "ses:SendRawEmail"],
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
        api.root.add_resource("photos").add_method("GET", apigw.LambdaIntegration(get_photos))
        
        profile = api.root.add_resource("profile")
        profile.add_resource("email").add_method("POST", apigw.LambdaIntegration(update_profile))
        
        # Frontend Hosting
        frontend_bucket = s3.Bucket(self, "WeddingFrontendBucket",
            bucket_name="wedding-frontend-prod-nocera", # Explicit unique name
            website_index_document="index.html",
            website_error_document="404.html",
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
            sources=[s3_deploy.Source.asset("../frontend_vite/dist")],
            destination_bucket=frontend_bucket
        )

        CfnOutput(self, "ApiUrl", value=api.url)
        CfnOutput(self, "FrontendUrl", value=frontend_bucket.bucket_website_url)

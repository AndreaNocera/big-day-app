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
    Aspects,
    Duration
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
        
        photos_table.add_global_secondary_index(
            index_name="S3KeyIndex",
            partition_key=dynamodb.Attribute(name="s3Key", type=dynamodb.AttributeType.STRING),
            projection_type=dynamodb.ProjectionType.ALL
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
            "MAILERSEND_API_KEY": os.getenv("MAILERSEND_API_KEY", ""),
            "MAILERSEND_FROM_EMAIL": os.getenv("MAILERSEND_FROM_EMAIL", "noreply@yourdomain.com"),
            "COUPLE_NAMES_IT": os.getenv("COUPLE_NAMES_IT", "gli sposi"),
            "COUPLE_NAMES_ES": os.getenv("COUPLE_NAMES_ES", "los novios"),
            "COUPLE_NAMES_EN": os.getenv("COUPLE_NAMES_EN", "the couple"),
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

        process_photo = _lambda.Function(self, "ProcessPhoto",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/process_photo"),
            memory_size=512, # Increase for image processing
            timeout=Duration.seconds(60),
            **lambda_kwargs
        )

        update_profile = _lambda.Function(self, "UpdateProfile",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/update_profile"),
            **lambda_kwargs
        )

        admin_get_rsvps = _lambda.Function(self, "AdminGetRsvps",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/admin_get_rsvps"),
            **lambda_kwargs
        )

        admin_get_photos = _lambda.Function(self, "AdminGetPhotos",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/admin_get_photos"),
            **lambda_kwargs
        )

        admin_get_media_url = _lambda.Function(self, "AdminGetMediaUrl",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/admin_get_media_url"),
            **lambda_kwargs
        )

        admin_delete_media = _lambda.Function(self, "AdminDeleteMedia",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/admin_delete_media"),
            timeout=Duration.seconds(60),
            **lambda_kwargs
        )

        verify_photo_access = _lambda.Function(self, "VerifyPhotoAccess",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/verify_photo_access"),
            **lambda_kwargs
        )

        guest_register = _lambda.Function(self, "GuestRegister",
            handler="handler.handler",
            code=_lambda.Code.from_asset("../lambda/guest_register"),
            **lambda_kwargs
        )

        # Permissions
        invites_table.grant_read_write_data(send_invites)
        invites_table.grant_read_write_data(verify_magic_link)
        rsvp_table.grant_read_write_data(rsvp_handler)
        rsvp_table.grant_read_write_data(survey_handler)
        rsvp_table.grant_read_write_data(update_profile)
        photos_table.grant_read_write_data(get_upload_url)
        # get_upload_url valida il codice foto (item PHOTOACCESS# in WeddingInvites)
        invites_table.grant_read_data(get_upload_url)
        # verify_photo_access legge solo; guest_register valida il codice e crea il profilo PHOTOGUEST#
        invites_table.grant_read_data(verify_photo_access)
        invites_table.grant_read_write_data(guest_register)
        photos_table.grant_read_write_data(process_photo) # Need write for thumbKey
        photos_table.grant_read_data(get_photos)
        photos_table.grant_read_data(admin_get_photos)
        photos_table.grant_read_data(admin_get_media_url)
        photos_table.grant_read_write_data(admin_delete_media)
        rsvp_table.grant_read_data(admin_get_rsvps)
        invites_table.grant_read_data(admin_get_rsvps)
        
        photos_bucket.grant_put(get_upload_url)
        photos_bucket.grant_put_acl(get_upload_url)
        photos_bucket.grant_read(get_photos)
        photos_bucket.grant_read(admin_get_photos)
        photos_bucket.grant_read(admin_get_media_url)
        photos_bucket.grant_delete(admin_delete_media)
        photos_bucket.grant_read_write(process_photo) # Read original, write thumb

        # S3 Trigger for process_photo
        from aws_cdk import aws_s3_notifications as s3n
        photos_bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            s3n.LambdaDestination(process_photo),
            s3.NotificationKeyFilter(prefix="uploads/")
        )

        # Add SNS permissions to send_invites
        send_invites.add_to_role_policy(iam.PolicyStatement(
            actions=["sns:Publish"],
            resources=["*"]
        ))

        # Removed SES permissions for update_profile since we are using MailerSend HTTP API

        # API Gateway
        api = apigw.RestApi(self, "WeddingApi",
            rest_api_name="Wedding Service",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                # X-Photo-Code e' l'header custom usato per autorizzare l'upload foto
                allow_headers=[*apigw.Cors.DEFAULT_HEADERS, "X-Photo-Code"]
            )
        )

        # api.root.add_resource("invites").add_resource("send").add_method("POST", apigw.LambdaIntegration(send_invites))
        auth = api.root.add_resource("auth")
        auth.add_resource("verify").add_method("POST", apigw.LambdaIntegration(verify_magic_link))
        auth.add_resource("guest").add_method("POST", apigw.LambdaIntegration(guest_register))
        rsvp = api.root.add_resource("rsvp")
        rsvp.add_method("POST", apigw.LambdaIntegration(rsvp_handler))
        rsvp.add_method("GET", apigw.LambdaIntegration(rsvp_handler))
        # api.root.add_resource("survey").add_method("POST", apigw.LambdaIntegration(survey_handler))
        photos = api.root.add_resource("photos")
        photos.add_method("GET", apigw.LambdaIntegration(get_photos))
        photos.add_resource("upload").add_method("POST", apigw.LambdaIntegration(get_upload_url))
        photos.add_resource("delete").add_method("POST", apigw.LambdaIntegration(admin_delete_media))
        photos.add_resource("access").add_resource("verify").add_method("POST", apigw.LambdaIntegration(verify_photo_access))
        
        profile = api.root.add_resource("profile")
        profile.add_resource("email").add_method("POST", apigw.LambdaIntegration(update_profile))

        admin = api.root.add_resource("admin")
        admin.add_resource("rsvps").add_method("GET", apigw.LambdaIntegration(admin_get_rsvps))
        admin_photos = admin.add_resource("photos")
        admin_photos.add_method("GET", apigw.LambdaIntegration(admin_get_photos))
        admin_photos.add_resource("media-url").add_method("POST", apigw.LambdaIntegration(admin_get_media_url))
        admin_photos.add_resource("delete").add_method("POST", apigw.LambdaIntegration(admin_delete_media))
        
        # Frontend Hosting
        frontend_bucket = s3.Bucket(self, "WeddingFrontendBucket",
            bucket_name="wedding-frontend-prod-nocera", # Explicit unique name
            website_index_document="index.html",
            # SPA: i deep-link (es. /photos-on?c=...) devono servire l'app React
            website_error_document="index.html",
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
        # Deployment
        skip_frontend = self.node.try_get_context("skip_frontend") == "true"
        if not skip_frontend:
            s3_deploy.BucketDeployment(self, "DeployFrontend",
                sources=[s3_deploy.Source.asset("../frontend_vite/dist")],
                destination_bucket=frontend_bucket
            )

        CfnOutput(self, "ApiUrl", value=api.url)
        CfnOutput(self, "FrontendUrl", value=frontend_bucket.bucket_website_url)

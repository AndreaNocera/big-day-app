#!/usr/bin/env python3
import os
import aws_cdk as cdk
from wedding_stack import WeddingStack

app = cdk.App()
WeddingStack(app, "WeddingStack",
    env=cdk.Environment(region=os.getenv("CDK_DEFAULT_REGION", "eu-west-1"))
)

app.synth()

import json

def json_response(status_code, body):
    """
    Returns a consistent JSON response with required CORS headers
    for AWS Lambda Proxy Integration.
    """
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",  # In prod you might want to restrict this
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            "Access-Control-Allow-Headers": "Content-Type,Authorization"
        },
        "body": json.dumps(body)
    }

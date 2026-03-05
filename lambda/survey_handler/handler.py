import json
import os
import sys
from datetime import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.aws_clients import dynamodb
from shared.jwt_helper import verify_token

def handler(event, context):
    try:
        headers = event.get("headers", {})
        auth_header = headers.get("authorization", headers.get("Authorization", ""))
        
        if not auth_header.startswith("Bearer "):
            return {"statusCode": 401, "body": json.dumps({"error": "Non autorizzato"})}
            
        token = auth_header.split(" ")[1]
        payload = verify_token(token)
        
        if not payload:
            return {"statusCode": 401, "body": json.dumps({"error": "Token invalido o scaduto"})}
            
        email = payload.get("email")
        
        body = json.loads(event.get("body", "{}"))
        survey_answers = body.get("surveyAnswers", {})
        
        if not isinstance(survey_answers, dict):
            return {"statusCode": 400, "body": json.dumps({"error": "surveyAnswers deve essere un array/oggetto"})}
        
        table = dynamodb.Table("WeddingRSVP")
        
        table.update_item(
            Key={"PK": f"GUEST#{email}"},
            UpdateExpression="SET surveyAnswers = :sa, submittedAt = :s",
            ExpressionAttributeValues={
                ":sa": survey_answers,
                ":s": datetime.utcnow().isoformat()
            }
        )
        
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Sondaggio salvato con successo"})
        }
        
    except Exception as e:
        print(f"Errore: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": "Errore interno server"})}

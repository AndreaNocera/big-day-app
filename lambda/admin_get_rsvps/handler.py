import json
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.aws_clients import dynamodb
from shared.jwt_helper import verify_token

def handler(event, context):
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": True
    }
    try:
        headers = event.get("headers", {})
        auth_header = headers.get("authorization", headers.get("Authorization", ""))

        if not auth_header.startswith("Bearer "):
            return {"statusCode": 401, "headers": cors_headers, "body": json.dumps({"error": "Non autorizzato"})}

        token = auth_header.split(" ")[1]
        payload = verify_token(token)

        if not payload:
            return {"statusCode": 401, "headers": cors_headers, "body": json.dumps({"error": "Token invalido o scaduto"})}

        # Admin-only endpoint
        if not payload.get("isAdmin", False):
            return {"statusCode": 403, "headers": cors_headers, "body": json.dumps({"error": "Accesso non autorizzato"})}

        # Consideriamo risposte soltanto i record che contengono effettivamente
        # il campo attending. In questo modo escludiamo record creati dal solo
        # salvataggio email ed eventuali record legacy di tipo survey.
        table = dynamodb.Table("WeddingRSVP")
        response = table.scan(FilterExpression="attribute_exists(attending)")
        items = response.get("Items", [])

        while "LastEvaluatedKey" in response:
            response = table.scan(
                FilterExpression="attribute_exists(attending)",
                ExclusiveStartKey=response["LastEvaluatedKey"],
            )
            items.extend(response.get("Items", []))

        # La tabella WeddingInvites contiene anche codici foto e photo guest.
        # Gli inviti reali sono identificati dal prefisso TOKEN#.
        invites_table = dynamodb.Table("WeddingInvites")
        invite_scan_args = {
            "Select": "COUNT",
            "FilterExpression": "begins_with(PK, :prefix)",
            "ExpressionAttributeValues": {":prefix": "TOKEN#"},
        }
        invites_response = invites_table.scan(**invite_scan_args)
        total_invites = invites_response.get("Count", 0)

        while "LastEvaluatedKey" in invites_response:
            invites_response = invites_table.scan(
                **invite_scan_args,
                ExclusiveStartKey=invites_response["LastEvaluatedKey"],
            )
            total_invites += invites_response.get("Count", 0)

        # Sort by submittedAt descending
        items.sort(key=lambda x: x.get("submittedAt", ""), reverse=True)

        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({
                "rsvps": items,
                "totalInvites": total_invites
            }, default=str)
        }

    except Exception as e:
        print(f"Errore admin_get_rsvps: {e}")
        return {"statusCode": 500, "headers": cors_headers, "body": json.dumps({"error": "Errore interno server"})}

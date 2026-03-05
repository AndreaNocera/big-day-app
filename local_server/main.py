import os
import sys
import json
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Add lambda path so handlers can be imported
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'lambda'))

from send_invites.handler import handler as send_invites_handler
from verify_magic_link.handler import handler as verify_magic_link_handler
from rsvp_handler.handler import handler as rsvp_handler
from survey_handler.handler import handler as survey_handler
from get_upload_url.handler import handler as get_upload_url_handler
from get_photos.handler import handler as get_photos_handler

from pydantic import BaseModel
from typing import Optional, Dict, Any

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends

app = FastAPI(
    title="Wedding API Local",
    description="FastAPI wrapper per AWS Lambdas. Permette di testare gli endpoint con documentazione interattiva.",
    version="1.0.0"
)

security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models for Swagger
class AuthVerifyRequest(BaseModel):
    token: Optional[str] = None
    email: Optional[str] = None
    phoneNumber: Optional[str] = None
    accessCode: Optional[str] = None

class RSVPRequest(BaseModel):
    attending: bool
    plusOne: bool = False
    dietaryRestrictions: str = ""

class SurveyRequest(BaseModel):
    surveyAnswers: Dict[str, Any]

class UploadUrlRequest(BaseModel):
    filename: str
    contentType: str = "image/jpeg"

class InviteTrigger(BaseModel):
    pass

async def handle_lambda(request: Request, lambda_handler, body_data: Any = None):
    try:
        if body_data is not None:
            # Se body_data è un modello Pydantic, convertilo in JSON string
            if hasattr(body_data, "model_dump_json"):
                body_str = body_data.model_dump_json()
            else:
                body_str = json.dumps(body_data)
        else:
            body_bytes = await request.body()
            body_str = body_bytes.decode("utf-8") if body_bytes else "{}"
        
        headers = {k.lower(): v for k, v in request.headers.items()}
        
        event = {
            "body": body_str,
            "headers": headers,
            "queryStringParameters": dict(request.query_params)
        }
        
        result = lambda_handler(event, {})
        
        status_code = result.get("statusCode", 500)
        response_body = json.loads(result.get("body", "{}"))
        
        return JSONResponse(status_code=status_code, content=response_body)
    except Exception as e:
        print(f"Errore handler FastAPI: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/invites/send", summary="Invia inviti (SMS)")
async def send_invites_route(request: Request, body: InviteTrigger = None):
    """Lancia l'invio massivo di SMS agli invitati che non hanno ancora usato il loro token."""
    return await handle_lambda(request, send_invites_handler, body)

@app.post("/auth/verify", summary="Verifica Magic Link")
async def verify_magic_link_route(request: Request, body: AuthVerifyRequest):
    """Valida il token inviato via SMS e restituisce un JWT."""
    return await handle_lambda(request, verify_magic_link_handler, body)

@app.post("/rsvp", summary="Salva RSVP")
async def rsvp_route(request: Request, body: RSVPRequest, auth: HTTPAuthorizationCredentials = Depends(security)):
    """Salva la conferma di partecipazione. Richiede header Authorization."""
    return await handle_lambda(request, rsvp_handler, body)

@app.post("/survey", summary="Salva Sondaggio")
async def survey_route(request: Request, body: SurveyRequest, auth: HTTPAuthorizationCredentials = Depends(security)):
    """Salva le risposte al sondaggio (musica, messaggi). Richiede header Authorization."""
    return await handle_lambda(request, survey_handler, body)

@app.post("/upload/url", summary="Ottieni URL per Upload Foto")
async def get_upload_url_route(request: Request, body: UploadUrlRequest, auth: HTTPAuthorizationCredentials = Depends(security)):
    """Genera un URL firmato di S3/MinIO per caricare direttamente una foto dal browser."""
    return await handle_lambda(request, get_upload_url_handler, body)

@app.get("/photos", summary="Lista Foto")
async def get_photos_route(request: Request, auth: HTTPAuthorizationCredentials = Depends(security)):
    """Recupera la lista delle foto caricate con URL firmati per la visualizzazione."""
    return await handle_lambda(request, get_photos_handler)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

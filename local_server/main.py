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
from update_profile.handler import handler as update_profile_handler
from process_photo.handler import handler as process_photo_handler
from admin_get_rsvps.handler import handler as admin_get_rsvps_handler
from admin_get_photos.handler import handler as admin_get_photos_handler
from verify_photo_access.handler import handler as verify_photo_access_handler
from guest_register.handler import handler as guest_register_handler

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

class Guest(BaseModel):
    name: str
    isChild: bool

class RSVPRequest(BaseModel):
    attending: bool
    guests: Optional[list[Guest]] = []
    dietaryRestrictions: str = ""
    sleepAtCastle: Optional[bool] = None
    busInterested: Optional[bool] = None

class SurveyRequest(BaseModel):
    surveyAnswers: Dict[str, Any]

class UploadUrlRequest(BaseModel):
    filename: str
    contentType: str = "image/jpeg"

class InviteTrigger(BaseModel):
    pass

class PhotoAccessRequest(BaseModel):
    code: str

class GuestRegisterRequest(BaseModel):
    code: str
    firstName: str
    lastName: str

class ProfileRequest(BaseModel):
    email: str

async def handle_lambda(request: Request, lambda_handler, body_data: Any = None):
    try:
        if body_data is not None:
            # Se body_data è un modello Pydantic, convertilo in JSON string
            if hasattr(body_data, "model_dump_json"):
                body_str = body_data.model_dump_json()
            elif hasattr(body_data, "json"): # Vecchia versione pydantic
                body_str = body_data.json()
            else:
                body_str = json.dumps(body_data)
        else:
            body_bytes = await request.body()
            body_str = body_bytes.decode("utf-8") if body_bytes else "{}"
        
        headers = {k.lower(): v for k, v in request.headers.items()}
        
        event = {
            "httpMethod": request.method,
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

# @app.post("/invites/send", summary="Invia inviti (SMS)")
# async def send_invites_route(request: Request, body: InviteTrigger = None):
#     """Lancia l'invio massivo di SMS agli invitati che non hanno ancora usato il loro token."""
#     return await handle_lambda(request, send_invites_handler, body)

@app.post("/auth/verify", summary="Verifica Magic Link")
async def verify_magic_link_route(request: Request, body: AuthVerifyRequest):
    """Valida il token inviato via SMS e restituisce un JWT."""
    return await handle_lambda(request, verify_magic_link_handler, body)

@app.post("/photos/access/verify", summary="Verifica Codice Accesso Foto")
async def verify_photo_access_route(request: Request, body: PhotoAccessRequest):
    """Valida il codice del link speciale foto. Endpoint pubblico."""
    return await handle_lambda(request, verify_photo_access_handler, body)

@app.post("/auth/guest", summary="Registrazione Photo Guest")
async def guest_register_route(request: Request, body: GuestRegisterRequest):
    """Registra un ospite senza invito (nome + cognome + codice foto) e restituisce un JWT."""
    return await handle_lambda(request, guest_register_handler, body)

@app.post("/rsvp", summary="RSVP chiuso (compatibilita')")
async def rsvp_post_route(request: Request, body: RSVPRequest, auth: HTTPAuthorizationCredentials = Depends(security)):
    """Route mantenuta per compatibilita': il backend rifiuta nuove modifiche."""
    return await handle_lambda(request, rsvp_handler, body)

@app.get("/rsvp", summary="Carica RSVP")
async def rsvp_get_route(request: Request, auth: HTTPAuthorizationCredentials = Depends(security)):
    """Recupera la conferma di partecipazione esistente. Richiede header Authorization."""
    return await handle_lambda(request, rsvp_handler)

# @app.post("/survey", summary="Salva Sondaggio")
# async def survey_route(request: Request, body: SurveyRequest, auth: HTTPAuthorizationCredentials = Depends(security)):
#     """Salva le risposte al sondaggio (musica, messaggi). Richiede header Authorization."""
#     return await handle_lambda(request, survey_handler, body)

@app.post("/photos/upload", summary="Ottieni URL per Upload Foto")
async def get_upload_url_route(request: Request, body: UploadUrlRequest, auth: HTTPAuthorizationCredentials = Depends(security)):
    """Genera un URL firmato di S3/MinIO per caricare direttamente una foto dal browser."""
    return await handle_lambda(request, get_upload_url_handler, body)

@app.get("/photos", summary="Lista Foto")
async def get_photos_route(request: Request, auth: HTTPAuthorizationCredentials = Depends(security)):
    """Recupera la lista delle foto caricate con URL firmati per la visualizzazione."""
    return await handle_lambda(request, get_photos_handler)

@app.post("/profile/email", summary="Aggiorna Profilo (Email)")
async def update_profile_route(request: Request, body: ProfileRequest, auth: HTTPAuthorizationCredentials = Depends(security)):
    """Salva l'email opzionale nel profilo dell'utente."""
    return await handle_lambda(request, update_profile_handler, body)

@app.get("/admin/rsvps", summary="[Admin] Tutti gli RSVP")
async def admin_get_rsvps_route(request: Request, auth: HTTPAuthorizationCredentials = Depends(security)):
    """Restituisce tutti gli RSVP. Richiede token admin."""
    return await handle_lambda(request, admin_get_rsvps_handler)

@app.get("/admin/photos", summary="[Admin] Tutte le foto per ospite")
async def admin_get_photos_route(request: Request, auth: HTTPAuthorizationCredentials = Depends(security)):
    """Restituisce tutte le foto raggruppate per ospite. Richiede token admin."""
    return await handle_lambda(request, admin_get_photos_handler)

@app.post("/photos/debug-process", summary="DEBUG: Trigger Process Photo manually")
async def debug_process_photo(request: Request, body: Dict[str, str], auth: HTTPAuthorizationCredentials = Depends(security)):
    """
    Simula il trigger S3 per processare una foto in locale.
    Passa {"s3Key": "uploads/..."} nel body.
    """
    s3_key = body.get("s3Key")
    bucket_name = "wedding-photos-local"
    
    # Costruisci l'evento S3 finto
    event = {
        "Records": [{
            "s3": {
                "bucket": {"name": bucket_name},
                "object": {"key": s3_key}
            }
        }]
    }
    
    try:
        process_photo_handler(event, {})
        return {"status": "success", "message": f"Processed {s3_key}"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

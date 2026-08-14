# Big Day App

Web app privata per un evento, con pagine informative multilingua, area invitati,
monitoraggio RSVP e condivisione di foto e video. Il progetto usa un frontend statico
React/Vite e un backend serverless AWS scritto in Python.

Questo documento e `AGENTS.md` sono le fonti di verita' per riprendere lo
sviluppo. `OLD_GEMINI.md` descrive una versione precedente e va consultato solo
come riferimento storico.

## Stato corrente

Il progetto e' in una fase operativa avanzata:

- il frontend compila per la produzione;
- la homepage apre con un blocco multilingua in evidenza dedicato agli ultimi
  orari di cerimonia, soggiorno e autobus, seguito dal contenuto storico; dalla
  card della cerimonia l'evento puo' essere aggiunto a Google Calendar oppure
  scaricato in formato iCalendar compatibile con iOS e altri calendari;
- autenticazione, pagine informative e dashboard amministrativa sono presenti;
- le conferme RSVP sono chiuse sia nell'interfaccia sia nel backend e mostrate
  in sola lettura;
- il flusso foto/video tramite link revocabile e upload multiplo e' implementato;
- esiste un solo ambiente di sviluppo locale e un ambiente AWS di produzione;
- non esiste un ambiente remoto di test o staging.

L'ultima area sviluppata e' il flusso media: accesso tramite link speciale,
registrazione semplificata dei photo guest, upload multiplo senza limite numerico,
conferma preventiva tramite la stessa modale applicativa in homepage e galleria
(con conteggio delle sole categorie presenti), thumbnail delle immagini e
download amministrativo on demand. Ogni utente puo' eliminare fisicamente un
proprio contenuto; l'admin puo' inoltre eliminare media di qualunque utente in
modalita' logica o fisica, anche in modo massivo. Sono accettate immagini JPEG,
PNG, WebP, HEIC e HEIF fino a 20 MB
e video MP4, MOV e WebM fino a 500 MB per file; gli upload diretti verso S3/MinIO
restano limitati a tre operazioni contemporanee.

## Architettura

```text
Browser
  -> React 19 + Vite + TypeScript
  -> API Gateway
       -> Lambda Python 3.12
            -> DynamoDB: inviti, RSVP, metadati foto/video
            -> S3: originali e thumbnail
            -> MailerSend: conferma email

Ambiente locale
  -> Docker Compose
       -> frontend Vite
       -> FastAPI, wrapper degli handler Lambda
       -> DynamoDB Local
       -> MinIO
       -> MailHog
```

### Directory principali

| Percorso | Responsabilita' |
| --- | --- |
| `frontend_vite/` | Frontend attivo React/Vite. |
| `frontend_vite/src/pages/` | Pagine e route applicative. |
| `frontend_vite/src/locales/` | Contenuti in italiano, spagnolo, inglese e francese. |
| `lambda/` | Handler backend, uno per funzione AWS. |
| `lambda/shared/` | JWT, client AWS, risposte HTTP e autorizzazione foto condivisi. |
| `local_server/` | Adattatore FastAPI per eseguire le Lambda in locale. |
| `infra/` | Stack AWS CDK in Python. |
| `scripts/` | Inizializzazione locale, seed e strumenti operativi. |

## Flussi applicativi attivi

### Utente invitato

1. Accede con numero di telefono e PIN.
2. Riceve un JWT persistito nel browser.
3. Consulta il proprio RSVP in sola lettura.
4. Puo' salvare un indirizzo email e ricevere una conferma.
5. Puo' usare la galleria solo quando possiede un codice foto valido o e' admin.

### Photo guest

1. Apre `/photos-on?c=<codice>`.
2. Il backend verifica che il codice sia attivo.
3. Se non ha gia' una sessione, si registra con nome e cognome.
4. Riceve un JWT con `isPhotoGuest=true`.
5. Puo' caricare, consultare ed eliminare fisicamente le proprie foto e i propri
   video, ma non accedere all'RSVP. La proprieta' e' verificata usando
   l'identificativo sintetico nel JWT e nel campo `uploadedBy`.

Le chiamate autenticate passano dal client API condiviso. Se upload, galleria,
RSVP, profilo o area admin ricevono `401`, il frontend elimina automaticamente
il JWT non piu' valido e apre `/accedi` conservando sia il percorso di ritorno
sia l'eventuale codice foto gia' validato dal QR. In questo recupero viene
mostrato per primo il login telefono+PIN, con un avviso di sessione scaduta.

Il codice foto in chiaro non viene salvato nel database: viene memorizzato solo
il suo hash SHA-256. La revoca viene controllata nuovamente dal backend prima di
ogni richiesta di upload.

Le immagini in attesa della thumbnail appaiono con un placeholder. La galleria
controlla lo stato ogni 5 secondi per un massimo di 5 tentativi; se alcune
anteprime non sono ancora pronte, conferma che gli originali sono stati caricati
e invita l'utente a rientrare dopo qualche minuto.

### Amministratore

Un JWT con `isAdmin=true` consente di:

- visualizzare statistiche e risposte RSVP;
- consultare foto e video raggruppati per autore;
- scaricare gli originali;
- eliminare un singolo media o tutti i media visibili di un utente;
- caricare foto e video senza codice foto.

L'eliminazione amministrativa richiede sempre una conferma esplicita. La
modalita' logica marca i record come eliminati e li nasconde da tutte le
gallerie, conservando record DynamoDB e file S3 per un eventuale recupero. La
modalita' fisica elimina originali e thumbnail da S3 e rimuove definitivamente
i record DynamoDB.

Le verifiche dei ruoli devono sempre restare anche nel backend. I controlli delle
route React servono all'esperienza utente, non costituiscono autorizzazione.

## Route principali

Frontend:

- `/`: home e accesso rapido alla galleria quando abilitata;
- `/accedi`: login invitato o registrazione photo guest;
- `/location`, `/viaggio`, `/regalo`, `/faq`: contenuti pubblici;
- `/rsvp`: riepilogo RSVP per invitati autenticati;
- `/foto`: galleria e upload di foto/video;
- `/photos-on`: landing del link foto;
- `/admin`: dashboard riservata agli amministratori.

API attive:

- `POST /auth/verify`;
- `POST /auth/guest`;
- `POST /photos/access/verify`;
- `GET /rsvp`; `POST /rsvp` e' mantenuta per compatibilita', ma rifiuta le
  modifiche mentre le conferme sono chiuse;
- `GET /photos`, `POST /photos/upload` e `POST /photos/delete` (solo
  cancellazione fisica di un singolo media appartenente all'utente autenticato);
- `POST /profile/email`;
- `GET /admin/rsvps`, `GET /admin/photos`, `POST /admin/photos/media-url` e
  `POST /admin/photos/delete`.

Gli handler `send_invites` e `survey_handler` sono legacy: vengono ancora creati
dallo stack, ma le loro route API sono commentate e non fanno parte del flusso
attivo.

## Modello dati essenziale

### `WeddingInvites`

Tabella condivisa da piu' tipi di record, riconoscibili dal prefisso della PK:

- `TOKEN#...`: invitato con telefono, PIN, nome, ruolo e scadenza;
- `PHOTOACCESS#...`: hash di un codice foto, etichetta e stato attivo;
- `PHOTOGUEST#...`: profilo minimale creato tramite link foto.

### `WeddingRSVP`

- PK `GUEST#<identificatore>`;
- presenza, accompagnatori, bambini, esigenze alimentari;
- interesse per pernottamento e trasporto;
- email opzionale e date di aggiornamento.

### `WeddingPhotos`

- PK `PHOTO#<uuid>`;
- autore e nome visualizzato;
- chiave S3 originale, eventuale chiave thumbnail, tipo media, MIME e data di upload;
- per le eliminazioni logiche: `deletedAt`, `deletionMode` e `deletedBy`;
- GSI `S3KeyIndex`, usato dal processore delle thumbnail.

I record storici senza `mediaType` e `contentType` sono interpretati come immagini.
Gli originali HEIC/HEIF vengono conservati nel formato ricevuto; il processore
usa `pillow-heif` per generare una thumbnail JPEG compatibile con i browser.
I video non vengono elaborati da Pillow. L'API della galleria utente non espone
mai gli originali: restituisce URL firmati soltanto per le thumbnail gia' create
e rappresenta i video con metadati privi di URL, usati dal frontend per un
placeholder statico. La lista amministrativa restituisce soltanto le thumbnail
delle immagini e nessun URL degli originali. `POST /admin/photos/media-url`
verifica nuovamente il ruolo admin e genera un URL originale valido 10 minuti
soltanto dopo un click esplicito su riproduzione o download.

## Configurazione e dati sensibili

Non inserire mai nel codice o nella documentazione valori reali di:

- credenziali AWS o MailerSend;
- `JWT_SECRET`;
- numeri di telefono o dati degli invitati;
- PIN, token JWT o link foto completi;
- URL firmati S3;
- coordinate bancarie;
- URL privati dell'ambiente di produzione.

I file `.env`, `.env.local`, `.env.production`, `scripts/guests.csv`, le foto
personali e i locale personalizzati (`frontend_vite/src/locales/{it,en,es,fr}.ts`)
possono contenere dati privati. Sono tutti ignorati da Git; il file tracciato
`frontend_vite/src/locales/example_language.ts` deve contenere soltanto segnaposto. Non
mostrarne il contenuto nei log e non copiarlo in issue, documenti o risposte di
un agente IA. Per documentare la configurazione usare solo i nomi presenti in
`.env.example` e `frontend_vite/.env.example`.

Variabili principali:

- backend: `ENV`, `AWS_REGION`, `JWT_SECRET`, `TOKEN_EXPIRY_DAYS`,
  `MAILERSEND_API_KEY`, `MAILERSEND_FROM_EMAIL`, `S3_BUCKET`,
  `COUPLE_NAMES_IT`, `COUPLE_NAMES_ES`, `COUPLE_NAMES_EN`;
- frontend: `VITE_API_URL`, `VITE_ENABLE_PHOTOS`,
  `VITE_APP_TITLE`, `VITE_APP_META_DESCRIPTION`,
  `VITE_HONEYMOON_NAME_1`, `VITE_HONEYMOON_IBAN_1`,
  `VITE_HONEYMOON_NAME_2`, `VITE_HONEYMOON_IBAN_2`.

Le variabili `VITE_*` vengono incorporate nel bundle durante la build: non devono
contenere segreti, anche quando provengono da un file ignorato da Git.
Lo stesso vale per date, luoghi e link presenti nei locale: non vengono
versionati, ma diventano leggibili da chiunque riceva il frontend compilato.

## Avvio locale

Prerequisiti:

- Docker con Compose;
- Node.js e npm;
- Python compatibile con le dipendenze del progetto.

Preparazione iniziale:

```bash
cp .env.example .env
python3 -m venv .venv
.venv/bin/python -m pip install -r local_server/requirements.txt
cd frontend_vite && npm ci && cd ..
```

Usare in `.env` esclusivamente valori locali o placeholder. Avviare lo stack:

```bash
docker compose up -d --build
.venv/bin/python scripts/seed_guests.py
```

Docker Compose carica automaticamente il file `.env`, ma non `.env.local`. Se
le variabili locali sono salvate in `.env.local`, indicare esplicitamente il file:

```bash
docker compose --env-file .env.local up
```

Per avviare in background ricostruendo anche le immagini:

```bash
docker compose --env-file .env.local up -d --build
```

Servizi locali:

- frontend: `http://localhost:5173`;
- API e Swagger: `http://localhost:8000` e `http://localhost:8000/docs`;
- DynamoDB Local: `http://localhost:8001`;
- MinIO Console: `http://localhost:9001`;
- MailHog: `http://localhost:8025`.

Il reload automatico dell'API osserva gli handler e l'adapter FastAPI, ma
esclude `lambda/layer`: quella directory puo' essere rigenerata durante la
sintesi CDK e non contiene route applicative da ricaricare.

Per creare un link foto esclusivamente locale:

```bash
.venv/bin/python scripts/generate_photo_link.py --label local
```

Il comando stampa un segreto temporaneo: non copiarlo in documentazione, commit
o output condivisi.

## Verifiche locali

Backend:

```bash
.venv/bin/python -m pytest
```

Frontend:

```bash
cd frontend_vite
npm run build
```

Non esiste ancora una suite frontend. Prima di considerare conclusa una modifica
alla UI, verificare manualmente almeno navigazione mobile, cambio lingua,
persistenza della sessione e stati loading/error.

## Deploy

`deploy_aws.sh` prepara il layer Python, compila il frontend ed esegue CDK sul
profilo AWS configurato localmente. Il comando opera sull'ambiente di produzione:
non eseguirlo durante normali analisi o test e non lanciarlo senza una richiesta
esplicita del proprietario del progetto.

```bash
./deploy_aws.sh
```

Le opzioni `--skip-layer` e `--skip-frontend` saltano rispettivamente la
ricostruzione del layer e il deploy degli asset frontend.

## Debito tecnico noto

Da considerare prima di interventi non banali:

1. Le risorse dati CDK usano in piu' punti `RemovalPolicy.DESTROY`; prima di
   modificare o rimuovere lo stack serve una strategia di backup/retention.
2. Il login usa una scansione DynamoDB e non implementa rate limiting applicativo.
3. L'autenticazione degli invitati usa un PIN condiviso dallo script di import;
   non copiarne il valore in documentazione o test.
4. Gli handler legacy per inviti e survey contengono logica superata.
5. Non ci sono test automatici per frontend, generazione thumbnail ed
   email MailerSend.
6. CloudFront viene invalidato dallo script di deploy, ma la distribuzione non e'
   definita nello stack CDK: puo' esistere configurazione esterna allo IaC.

## Regola per aggiornare questo documento

Quando cambia un flusso, aggiornare nello stesso commit:

- route e ruoli interessati;
- variabili d'ambiente, indicando solo il nome;
- modello dati e migrazioni richieste;
- procedura locale e verifiche eseguite;
- sezione del debito tecnico, rimuovendo le note risolte.

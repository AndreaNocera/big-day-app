# Istruzioni operative per agenti IA

Leggere interamente `README.md` prima di modificare il progetto. Questo file
contiene le regole di lavoro; `README.md` descrive architettura, flussi, setup e
debito tecnico. `OLD_GEMINI.md` e' storico e non e' una fonte aggiornata.

## Prima di iniziare

1. Eseguire `git status --short --branch` e preservare ogni modifica esistente.
2. Identificare se la richiesta riguarda frontend, Lambda, ambiente locale o IaC.
3. Leggere i file direttamente coinvolti e i relativi chiamanti prima di editare.
4. Non assumere che il codice locale coincida con il deploy AWS corrente.
5. Non eseguire deploy o operazioni AWS mutanti senza richiesta esplicita.

## Privacy e segreti

Il repository appartiene a un evento privato e puo' contenere dati personali.

- Non stampare, riassumere o copiare valori da file `.env*`.
- Non mostrare dati da `scripts/guests.csv` o da esportazioni DynamoDB.
- Non includere in test o documenti nomi reali, telefoni, PIN, IBAN, JWT, link
  foto, URL firmati o indirizzi privati.
- Usare nomi e recapiti fittizi evidenti e non riconducibili a persone reali.
- Le variabili `VITE_*` sono pubbliche nel bundle: non usarle per segreti.
- Se un segreto appare tracciato o nell'output di uno strumento, non ripeterlo;
  segnalarne soltanto tipo e percorso e suggerire la rotazione.

## Verita' architetturali

- Il solo frontend attivo e' `frontend_vite`; il vecchio Next.js e' stato rimosso.
- Il backend di produzione e' AWS Lambda/API Gateway; FastAPI e' solo un adapter
  locale degli stessi handler.
- Esistono soltanto ambiente locale e produzione, non staging/test remoto.
- I ruoli applicativi sono invitato, photo guest e admin.
- RSVP e foto sono flussi distinti: un photo guest non deve accedere all'RSVP.
- Le conferme RSVP sono chiuse: `GET /rsvp` e' in sola lettura e il backend deve
  rifiutare le modifiche tramite `POST /rsvp`.
- L'upload foto non e' autorizzato dalla sola UI: il backend deve verificare JWT,
  ruolo admin o codice foto attivo.
- `send_invites` e `survey_handler` sono legacy e non hanno route API attive.
- I contenuti multilingua personalizzati sono in `frontend_vite/src/locales`.

## Regole di modifica

- Preservare compatibilita' tra API Gateway e `local_server/main.py`.
- Quando si aggiunge o cambia una route, aggiornare frontend client, FastAPI,
  CDK, CORS e documentazione nello stesso intervento.
- Quando cambia il formato di un'immagine ammesso, sincronizzare frontend e
  `lambda/get_upload_url/handler.py`.
- Non modificare nomi di tabelle, prefissi PK o claim JWT senza una strategia di
  migrazione esplicita.
- Mantenere le autorizzazioni nel backend anche se la route React e' protetta.
- Non sovrascrivere foto, traduzioni o configurazioni personali ignorate da Git.
- Evitare dipendenze nuove se la libreria standard o una dipendenza esistente e'
  sufficiente, soprattutto nelle Lambda.
- Per le date Python nuove usare valori timezone-aware; `datetime.utcnow()` e'
  deprecato nelle versioni recenti di Python.

## Verifica minima

Per modifiche backend:

```bash
.venv/bin/python -m pytest
```

Per modifiche frontend:

```bash
cd frontend_vite
npm run build
```

Per modifiche full-stack eseguire entrambe. Se Docker e' disponibile, verificare
anche il flusso tramite lo stack locale. Non sostituire un test locale con una
prova sull'ambiente di produzione.

I test legacy saltati indicano servizi deliberatamente non esposti; non
riattivarli solo per far passare la suite. Se una richiesta li riporta in uso,
aggiornare prima il contratto e poi rimuovere lo skip.

## Consegna

Al termine indicare:

- file modificati e comportamento ottenuto;
- test/build eseguiti e relativo risultato;
- verifiche non eseguite e motivo;
- eventuali rischi o migrazioni richieste;
- se `README.md` necessita aggiornamenti per il cambiamento appena introdotto.

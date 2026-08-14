import pytest


@pytest.mark.skip(reason="Handler legacy non esposto da API Gateway")
def test_handler_legacy_non_esposto():
    """Promemoria esplicito: il servizio resta nel repository ma non e' attivo."""

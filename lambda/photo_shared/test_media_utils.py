import pytest

from photo_shared.media_utils import normalize_person_name, slugify_uploader_name


def test_unicode_names_and_slug_are_normalized():
    assert normalize_person_name("  Élodie   Marie ") == "Élodie Marie"
    assert normalize_person_name("D’Angelo-Test") == "D’Angelo-Test"
    assert slugify_uploader_name("Élodie D’Angelo") == "elodie-d-angelo"


@pytest.mark.parametrize("value", ["123456789", "password", "name/path", "A", "Name!"])
def test_invalid_person_names_are_rejected(value):
    with pytest.raises(ValueError):
        normalize_person_name(value)

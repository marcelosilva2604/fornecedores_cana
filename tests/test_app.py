from neonatal_app.app import app


def test_index_get():
    client = app.test_client()
    response = client.get('/')
    assert response.status_code == 200
    assert b'Triagens Neonatais' in response.data


def test_index_post():
    client = app.test_client()
    response = client.post('/', data={'dob': '2023-01-01', 'weight': '3000'})
    assert response.status_code == 200
    assert b'Triagem 1' in response.data

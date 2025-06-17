from supabase import create_client, Client
from typing import cast
from dotenv import load_dotenv
import requests
import random
import string
import os

load_dotenv()

SUPABASE_URL = cast(str, os.getenv("SUPABASE_URL"))
SUPABASE_SERVICE_KEY = cast(str, os.getenv("SUPABASE_SERVICE_KEY"))

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def generar_email_password():
    random_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    email = f"{random_id}@tudominio.com"
    password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
    return email, password

def usuario_existe(email):
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"
    }

    params = {
        "email": email
    }

    response = requests.get(url, headers=headers, params=params)

    if response.status_code == 200:
        data = response.json()
        for j in data['users']:
            if (j['email'] == email):
                return True
        return False
    else:
        print("❌ Error consultando usuarios:", response.status_code, response.text)
        return True

def crear_usuario(email, password):
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "email": email,
        "password": password,
        "email_confirm": True
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        print("✅ Usuario creado:", email)
        print("🔐 Contraseña:", password)
    else:
        print("❌ Error al crear usuario:", response.status_code, response.text)

def crear_usuario_unico():
    intentos = 0
    while intentos < 5:
        email, password = generar_email_password()
        if not usuario_existe(email):
            crear_usuario(email, password)
            return email, password
        else:
            print(f"⚠️ Email ya existe: {email}, reintentando...")
            intentos += 1
    return ("", "")
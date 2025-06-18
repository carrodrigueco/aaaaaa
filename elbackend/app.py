from flask import Flask, request, jsonify
import uuid
from datetime import datetime, timezone
import base64
from io import BytesIO
import secrets
import magic
from cliente import supabase
from cliente import crear_usuario_unico

app = Flask(__name__)

dics = {"fisico": 1, "psicologico": 2, "sexual": 3, "economico": 4, "negligencia": 5, "poder": 6, "otro":7}
dics_estados_reporte = {"1": "Abierto","2": "Cerrado","3": "En revision","4": "Reabierto"}
dics_tipos_evidencia = {"PDF": 1, "JPEG": 2, "PNG": 3}

if __name__ == '__main__':
    app.run()

@app.get("/")
def prom(): 
    return "<h1>VISTA PREDETERMINADA DE API BACKEND SAFEREPORT</h1>"

@app.post("/api/report")
def create_report():
    data = request.get_json()
    mensaje = "REPORTE CARGADO CON EXITO"

    abuse_type = data.get("abuseType")
    description = data.get("description")
    location = data.get("location")
    date_approx = data.get("dateApprox")
    files_json = data.get("evidenceFiles")

    filex = None
    aceptado = None
    tipo_evidencia = None

    if not all([abuse_type, description, location, date_approx]):
        return jsonify({"error": "Faltan campos requeridos"}), 400
    
    if(abuse_type == None or description == None or location == None or date_approx == None):
        return jsonify({"error": "Faltan campos requeridos"}), 400


    now = datetime.now(timezone.utc).isoformat()
    fecha_datetime = datetime.strptime(date_approx, "%Y-%m-%d")
    fecha_iso = fecha_datetime.isoformat() + "Z"

    # 1. Buscar o crear la organización
    location = location.lower().strip()
    resp = supabase.table("Organizaciones").select("*").eq("nombre_organizacion", location).execute()


    if resp.data:
        id_organizacion = resp.data[0]["id_organizaciones"]

    else:
        resp = supabase.table("Organizaciones").insert({
            "nombre_organizacion": location
        }).execute()
        id_organizacion = resp.data[0]["id_organizaciones"]

        # Crear gestor de caso con claves aleatorias
        gestor_user, gestor_pass = crear_usuario_unico()

        supabase.table("GestoresCasos").insert({
            "usuario_gestor": gestor_user,
            "password": gestor_pass,
            "id_organizacion": id_organizacion
        }).execute()

    resp = supabase.table("Reportes").insert({
        "id_organizacion": id_organizacion,
        "detalle": description,
        "tipo_abuso": abuse_type,
        "estado_reporte": 1,
        "fecha_suceso": fecha_iso 
    }).execute()

    id_reporte = resp.data[0]["id_reporte"]
    
    if(files_json != None):
        if len(files_json) > 0:
            for i, filete in enumerate(files_json):
                filex = None
                filex = BytesIO(base64.b64decode(filete["content"]))
                file_bytes = base64.b64decode(filete["content"])
                setattr(filex, "filename", filete["filename"])

                mime = magic.Magic(mime = True)
                mime_type = mime.from_buffer(file_bytes)
                aceptado = False
                match(mime_type):
                    case "application/pdf":
                        aceptado = True
                        tipo_evidencia = 1
                    case "image/jpeg":
                        aceptado = True
                        tipo_evidencia = 2
                    case "image/png":
                        aceptado = True
                        tipo_evidencia = 3
                    case _:
                        aceptado = False


                if(filex != None and aceptado):
                    storage_file_name = f"evidencias/{uuid.uuid4()}_{filete["filename"]}"
                    try:
                        supabase.storage.from_("safereport.files").upload(storage_file_name, filex.read())
                        public_url = supabase.storage.from_("safereport.files").get_public_url(storage_file_name)
                        supabase.table("Evidencia").insert({
                            "id_reporte": id_reporte,
                            "tipo_evidencia": tipo_evidencia,
                            "url_evidencia": public_url
                        }).execute()

                    except Exception as e:
                        return jsonify({"error": f"Error al subir archivo: {str(e)}"}), 500
                else:
                    mensaje += f"\nDocumento{i} {filete["filename"][:6]} NO AH SIDO CARGADO"




    supabase.table("ActualizacionesReportes").insert({
            "fecha": now,
            "detalle": "CREADO",
            "id_reporte": id_reporte
    }).execute()
    

    # 5. Insertar credencial de acceso
    codigo_credencial = secrets.token_urlsafe(12)

    supabase.table("Credenciales").insert({
        "codigo": codigo_credencial,
        "id_reporte": id_reporte,
        "fecha_creacion": now,
        "fecha_ultimo_uso": now
    }).execute()

    return jsonify({
        "mensaje": f"{mensaje}",
        "credencial": codigo_credencial
    }), 201

@app.get("/api/search/<credencial>")
def search(credencial):

    credencial_valido: dict = {"mensaje": "Credencial no valida"}
    reporte_valido: dict = {"mensaje": "No hay reporte asociado"}
    tipo_abuso = None
    file_path = None
    evidencia_data = []

    if len(credencial) < 16:
        return jsonify(credencial_valido)

    # Buscar credencial
    resp = supabase.table("Credenciales").select("*").eq("codigo", credencial).execute()
    if not resp.data:
        return jsonify(reporte_valido)

    id_reporte = resp.data[0]["id_reporte"]

    # Buscar reporte
    resp = supabase.table("Reportes").select("*").eq("id_reporte", id_reporte).single().execute()
    if not resp.data:
        return jsonify(reporte_valido)  # No hay reporte

    reporte = resp.data
    
    # Organización
    resp = supabase.table("Organizaciones").select("nombre_organizacion").eq(
        "id_organizaciones", reporte["id_organizacion"]
    ).single().execute()
    nombre_org = resp.data["nombre_organizacion"] if resp.data else None

    for key, value in dics: 
        if(value == reporte["tipo_abuso"]):
            tipo_abuso = key

    resp = supabase.table("Evidencias").select("id_evidencia, tipo_evidencia, url_evidencia").eq(
        "id_reporte", reporte["id_reporte"]
    ).execute()

    # Evidencia (con signed URL si hay evidencia)
    if (resp.data != None):
        for evidencia in resp.data:
            file_path = evidencia["url_evidencia"]
            file_path = file_path.split("public")[1].split("/")
            filename = file_path[3]
            file_path = file_path[2] +"/"+ file_path[3]
            

            # Descargar el archivo directamente desde Supabase Storage
            file_resp = supabase.storage.from_("safereport.files").download(file_path)
            if file_resp:
                encoded_content = base64.b64encode(file_resp).decode("utf-8")
                evidencia_data.append({
                    "filename": filename,
                    "content": encoded_content
                })

    # Actualizar fecha de último uso
    supabase.table("Credenciales").update({
        "fecha_ultimo_uso": datetime.now(timezone.utc).isoformat()
    }).eq("codigo", credencial).execute()

    estado_actual = reporte["estado_reporte"]

    return jsonify({
        "descripcion": reporte["detalle"],
        "organizacion": nombre_org,
        "tipo_abuso":  tipo_abuso,
        "evidencias": evidencia_data,
        "estado_reporte": dics_estados_reporte[str(estado_actual)],
        "fecha_suceso": reporte["fecha_suceso"]
    }), 200

@app.post("/api/update")
def update():
    data = request.get_json()

    credencial = data.get("credential")
    description = data.get("description")
    files_json = data.get("evidenceFiles")

    filex = None
    aceptado = None
    tipo_evidencia = None
    extra = ""

    credencial_valido: dict = {"mensaje": "Credencial no valida"}
    reporte_valido: dict = {"mensaje": "No hay reporte asociado"}

    if len(credencial) < 16:
        return jsonify(credencial_valido)

    # Buscar credencial
    credencial_resp = supabase.table("Credenciales").select("*").eq("codigo", credencial).execute()
    if not credencial_resp.data:
        return jsonify(reporte_valido)

    id_reporte = credencial_resp.data[0]["id_reporte"]
    response = supabase.table("Reportes").select("*").eq("id_reporte", id_reporte).execute()
    data = response.data[0]

    nuevo_estado = data["estado_reporte"] if response.data else ""
    now = datetime.now(timezone.utc).isoformat()

    if(data["estado_reporte"] == 2):
        nuevo_estado = 4

    detalle_str = response.data[0]['detalle'] if response.data else ""
    detalle_str += "\n"+description
    response = supabase.table("Reportes").update({"detalle": detalle_str, "estado_reporte": nuevo_estado}).eq("id_reporte", id_reporte).execute()

    supabase.table("ActualizacionesReportes").update({"detalle": "ACTUALIZACION", "fecha": now}).eq("id_reporte", id_reporte).execute()

    supabase.table("Credenciales").update({
        "fecha_ultimo_uso": now
    }).eq("codigo", credencial).execute()
    if(files_json != None):
        if len(files_json) > 0:
            for i, filete in enumerate(files_json):
                filex = None
                filex = BytesIO(base64.b64decode(filete["content"]))
                file_bytes = base64.b64decode(filete["content"])
                setattr(filex, "filename", filete["filename"])

                mime = magic.Magic(mime = True)
                mime_type = mime.from_buffer(file_bytes)
                aceptado = False
                match(mime_type):
                    case "application/pdf":
                        aceptado = True
                        tipo_evidencia = 1
                    case "image/jpeg":
                        aceptado = True
                        tipo_evidencia = 2
                    case "image/png":
                        aceptado = True
                        tipo_evidencia = 3
                    case _:
                        aceptado = False


                if(filex != None and aceptado):
                    storage_file_name = f"evidencias/{uuid.uuid4()}_{filete["filename"]}"
                    try:
                        supabase.storage.from_("safereport.files").upload(storage_file_name, filex.read())
                        public_url = supabase.storage.from_("safereport.files").get_public_url(storage_file_name)
                        supabase.table("Evidencia").insert({
                            "id_reporte": id_reporte,
                            "tipo_evidencia": tipo_evidencia,
                            "url_evidencia": public_url
                        }).execute()

                    except Exception as e:
                        return jsonify({"error": f"Error al subir archivo: {str(e)}"}), 500
                else:
                    extra += f"\nDocumento{i} {filete["filename"][:6]} NO AH SIDO CARGADO"

    if response.data:
        return jsonify({"mensaje": "success", "extra": extra})
    else:
        return jsonify({"mensaje": "error", "extra": extra})

@app.post("/api/fromgestor/update")
def update_report_org():
    return "<h1>IN PROCESS</h1>"
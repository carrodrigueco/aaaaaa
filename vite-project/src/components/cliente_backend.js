
/**
 * Función genérica para realizar solicitudes HTTP a la API.
 * @param {string} endpoint - Ruta específica de la API (ej. '/reports').
 * @param {object} [options={}] - Opciones para fetch (method, headers, body, etc.).
 * @returns {Promise<object|null|string>} - Respuesta JSON, null o texto plano.
 * @throws {Error} - Si hay error de red o la API responde con error.
 */
export async function makeRequest(endpoint, options = {})
{
    const BASE_URL = import.meta.env.VITE_API_URL;
    
    const url = `${BASE_URL}${endpoint}`;
    const defaultHeaders = {
        'Accept': 'application/json',
        // Solo se agrega Content-Type si no estás usando FormData
    };

    // Si el body es un objeto y no es FormData, asume JSON
    const isFormData = options.body instanceof FormData;

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...options.headers,
        },
        body: isFormData
            ? options.body
            : typeof options.body === 'object' && options.body !== null
                ? JSON.stringify(options.body)
                : options.body,
    };

    try 
    {
        const response = await fetch(url, config);

        const rawBody = await response.text();

        if (!response.ok)
        {
            let errorData;
            try
            {
                errorData = JSON.parse(rawBody);
            }
            catch
            {
                errorData = rawBody;
            }

            throw new Error(
                `API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
            );
        }

        if (response.status === 204 || rawBody.trim() === '')
        {
            return null;
        }

        try
        {
            return JSON.parse(rawBody);
        }
        catch
        {
            return rawBody;
        }
    }
    catch (error)
    {
        console.error(`Error en la solicitud a ${url}:`, error);
        throw error;
    }
}

/**
 * Busca un reporte por su credencial anónima.
 * @param {string} credential - La credencial anónima del reporte.
 * @returns {Promise<object>} Los detalles del reporte encontrado.
 */
export async function getReport(credential) 
{
    return makeRequest(`/search/${credential}`, {
        method: 'GET',
    });
}

/**
 * Envía un nuevo reporte de abuso.
 * @param {jsonString} reportData - Los datos del formulario del reporte.
 * @returns {Promise<object>} Los datos de confirmación del reporte (ej. la credencial anónima).
 */
export async function submitReport(reportData) {
    return await makeRequest('/report', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', // ← importante
        },
        body: JSON.stringify(reportData),       // ← convierte objeto a JSON
    });
}

/**
 * Busca un reporte por su credencial anónima.
 * @param {string} credential - La credencial anónima del reporte.
 * @returns {Promise<object>} Los detalles del reporte encontrado.
 */
export async function updateReport(credential, info, evidence)
{
    const algo = JSON.stringify({"credential": credential, "description": info, "evidenceFiles": evidence});
    console.log(algo);
  return await makeRequest('/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', // ← importante
        },
        body: algo,
    });

}

export function redirect_page(page)
{
    if(page == "index")
    {
        window.location.href = `../${page}.html`
    }
    else
    {
        window.location.href = `${page}.html`
    }
}

export function fileToBase64(file)
{
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const base64String = reader.result.split(',')[1]; // Quitar el encabezado tipo data:image/jpeg...
      resolve(base64String);
    };

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

export function getMimeTypeFromFilename(filename)
{
    let extension = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'pdf': 'application/pdf',
        'mp4': 'video/mp4',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav'
        // Agrega más si necesitas
    };

    if(extension.includes("?"))
    {
        extension = extension.slice(0, -1);
    }
    
    return mimeTypes[extension] || 'application/octet-stream';
}

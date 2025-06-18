import { getReport, updateReport, getMimeTypeFromFilename, fileToBase64} from './cliente_backend'

export const componente_buscar = {
  searchCredential: '',
  newUpdateText: '',
  isSearching: false,
  isUpdating: false,
  updateMessage: {
    text: '',
    type: ''
  },
  reportFound: false,
  updated: false,
  reportDetails: {evidences: []},
  newfiles: [],
  filesLoaded: false,
  searchMessage: { text: '', type: '' },


  async sendUpdate()
  {
    if (!this.newUpdateText.trim()) {
      this.updateMessage = {
        text: "El texto de actualización no puede estar vacío.",
        type: "error"
      };
      return;
    }

    this.isUpdating = true;
    this.updateMessage = { text: '', type: '' };

    const res = await updateReport(this.searchCredential.trim(), this.newUpdateText.trim(), this.newfiles);

    this.isUpdating = false;
    this.updateMessage = {
      type: res.mensaje ? 'success' : 'error'
    };

    console.log(res.mensaje);
    if (res.mensaje)
    {
      alert("PAGINA DICE: "+ res.mensaje + "\n "+ res.extra);
      this.newUpdateText = '';
      this.reportFound = false;
      // O podrías recargar los detalles del reporte aquí si tienes función de búsqueda
    }
    if(res.mensaje == 'success')
    {
      this.reportDetails.evidences = [];
    }
  },
  async searchReport()
  {
    this.searchMessage.text = '';
    this.isSearching = true;
    this.updated = false;

    try
    {
        const data = await getReport(`${this.searchCredential}`);

        // Obtener evidencias
        const la_evidencia = data.evidencias;
        
        this.reportDetails.id = this.searchCredential;
        this.reportDetails.status = data.estado_reporte || 'Desconocido';
        this.reportDetails.type = data.tipo_abuso || 'No especificado';
        this.reportDetails.description = data.descripcion || 'No proporcionada';
        this.reportDetails.location = data.organizacion || 'No especificada';
        
        // Procesar evidencias
        if(la_evidencia.length > 0)
        {
          for(let i = 0; i < la_evidencia.length; i++)
          {
            this.reportDetails.evidences.push({
                    evidenceName: la_evidencia[i].filename,
                    content: la_evidencia[i].content,
                    mime: getMimeTypeFromFilename(la_evidencia[i].filename),
                    index: i
                  });
          }
        }


        // Si `actualizaciones` aún no viene, puedes inicializar vacío
        this.reportDetails.updates = data.actualizaciones || [];


        this.reportFound = true;
        this.searchMessage = {
            text: 'Reporte encontrado con éxito.',
            type: 'success'
        };

    }
    catch (error)
    {
        console.error("Error al buscar reporte:", error);
        this.reportFound = false;
        this.searchMessage = {
            text: 'No se pudo encontrar el reporte. Verifica tu credencial.',
            type: 'error'
        };
    }
    finally
    {
        this.isSearching = false;
    }
  },
  async handleFileChange(event)
  {
    const files_array = event.target.files;

    if (files_array && files_array.length > 0)
    {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

        for (let i = 0; i < files_array.length; i++)
        {
            const file = files_array[i];

            if (!allowedTypes.includes(file.type))
            {
                continue;
            }

            const base64 = await fileToBase64(file);

            this.newfiles.push({
                filename: file.name,
                content: base64,
                index: i
            });
        }

        this.filesLoaded = this.newfiles.length > 0;
    }
    else
    {
        this.filesLoaded = false;
    }  
  },
  eliminarArchivo(index)
  {
      this.newfiles.splice(index, 1);
      // Si quieres actualizar alguna otra variable asociada
      this.filesLoaded = this.newfiles.length > 0;

  },
};
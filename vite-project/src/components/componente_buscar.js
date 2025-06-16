import { getReport, updateReport, getMimeTypeFromFilename} from './cliente_backend'

export const componente_buscar = {
  searchCredential: '',
  newUpdateText: '',
  isSearching: false,
  isUpdating: false,
  updateMessage: {
    type: ''
  },
  reportFound: false,
  updated: false,
  reportDetails: {evidences:[]},
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

    const res = await updateReport(this.searchCredential.trim(), this.newUpdateText.trim());

    this.isUpdating = false;
    this.updateMessage = {
      type: res.mensaje ? 'success' : 'error'
    };

    console.log(res.mensaje);
    if (res.mensaje)
    {
      alert("PAGINA DICE: "+res.mensaje);
      this.newUpdateText = '';
      this.reportFound = false;
      // O podrías recargar los detalles del reporte aquí si tienes función de búsqueda
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
        const evidencias = data.evidencias;
        
        this.reportDetails.id = this.searchCredential;
        this.reportDetails.status = data.estado_reporte || 'Desconocido';
        this.reportDetails.type = data.tipo_abuso || 'No especificado';
        this.reportDetails.description = data.descripcion || 'No proporcionada';
        this.reportDetails.location = data.organizacion || 'No especificada';
        
        // Procesar evidencias
        let mimeType;
        for(let i = 0; i < evidencias.length; i++)
        {
          mimeType = evidencias[i]?.filename ? getMimeTypeFromFilename(evidencias[i].filename) : null;
          this.reportDetails.evidences[i].content = evidencias[i]?.content
              ? `data:${mimeType};base64,${evidencias[i].content}`
              : null;
  
          this.reportDetails.evidences[i].evidenceName = evidencias[i].filename || null;
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
};
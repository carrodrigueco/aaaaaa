import { supabase } from './cliente_superbase.js'

export const componente_dashboard = {
  vista: 'reportes',
  gestor: {
    rol: '',
    organizacion: '',
    foto: ''
  },
  reportes: [],
  reporteSeleccionado: null,
  nota: '',
  nuevoEstado: '',
  evidenciasDelReporte: [],
  estados: ['Nuevo', 'En revisión', 'En progreso', 'Cerrado'],
  tipos_abuso: ['Fisico', 'Psicologico','Sexual','Economico','Negligencia','Poder', 'Otro'],
  tipo_evidencia: ['PDF', 'JPEG', 'PNG'],
  estadisticas: {
    total: 0,
    cerrados: 0,
    enProgreso: 0
  },

  async mounted()
  {
    const session = await supabase.auth.getSession();
    const user = session.data?.session?.user;

    if (!user)
    {
      window.location.href = '/login.html';
      return;
    }

    // Obtener información del gestor desde tabla `gestores`
    const { data: gestorData, error: errorGestor } = await supabase
      .from('GestoresCasos')
      .select('usuario_gestor, rol, organizacion, foto, id_organizacion')
      .eq('usuario_gestor', user.email)
      .single();

    if (errorGestor)
    {
      console.error("Error obteniendo gestor:", errorGestor.message);
      return;
    }

    if(gestorData.foto == null)
    {
      gestorData.foto = supabase.storage.from_("safereport.files").download("fotos_gestores/Avatar.png")
    }

    this.gestor = {
      rol: gestorData.rol,
      organizacion: gestorData.organizacion,
      foto: gestorData.foto
    };

    this.orgId = gestorData.id_organizacion;
    await this.cargarReportes();
    this.calcularEstadisticas();
  },

  async cargarReportes()
  {
    const { data, error } = await supabase
      .from('Reportes')
      .select('*')
      .eq('id_organizacion', this.orgId);

    if (error)
    {
      console.error('Error cargando reportes:', error.message);
      return;
    }

    this.reportes = data;
  },

  async verDetalle(reporte)
  {
    this.reporteSeleccionado = { ...reporte };
    this.nota = '';
    this.nuevoEstado = reporteSeleccionado.estado;

    // Obtener lista de evidencias del reporte
    const { data: evidencias, error: errorEvidencias } = await supabase
      .from('Evidencias')
      .select('id_evidencia, tipo_evidencia, url_evidencia')
      .eq('id_reporte', reporteSeleccionado.id_reporte);

    if (errorEvidencias) {
      console.error('Error cargando evidencias del reporte:', errorEvidencias.message);
      this.evidenciasDelReporte = [];
      return;
    }

    const evidenciasProcesadas = [];

    for (const evidencia of evidencias) {
      const filePath = evidencia.url_evidencia; // Ej: 'evidencias/imagen123.txt'
      const filename = filePath.split('/').pop();
      const mime = getMimeTypeFromFilename(filename);

      try {
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('safereport.files')
          .download(filePath);

        if (downloadError) {
          console.error(`Error descargando ${filePath}:`, downloadError.message);
          continue;
        }

        const base64Text = await fileData.text(); // Leer contenido base64 directamente

        evidenciasProcesadas.push({
          filename,
          mime,
          base64: base64Text, // ya es base64
        });

      } catch (err) {
        console.error(`Error procesando archivo ${filePath}:`, err);
      }
    }
  },

  async guardarCambios()
  {
    if (!this.reporteSeleccionado) return;

    const { id_reporte } = this.reporteSeleccionado;

    const updates = {
      detalle: this.nota,
      fecha: new Date().toISOString(),
      id_reporte: id_reporte
    };

    const { error } = await supabase
      .from('ActualizacionesReportes')
      .insert(updates);

    const { error2 } = await supabase
      .from('Reportes')
      .update({estado_reporte: this.nuevoEstado})
      .eq('id_reporte', id_reporte);

    if (error || error2)
    {
      alert('Error al guardar los cambios');
      console.error(error);
      return;
    }

    alert('Cambios guardados correctamente');
    this.reporteSeleccionado = null;

    await this.cargarReportes();
    this.calcularEstadisticas();
  },

  imprimir()
  {
    window.print();
  },

  async calcularEstadisticas()
  {
    
  },

  cerrarSesion() {
    supabase.auth.signOut().then(() => {
      localStorage.clear();
      window.location.href = '/login.html';
    });
  }
};
import { supabase } from './cliente_superbase.js'
 
export const componente = {
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
  stats: {
      total: 0,
      porTipo: {},
      porEstado: {},
      porMes: {}
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
      .select('usuario_gestor, rol, id_organizacion')
      .eq('usuario_gestor', user.email)
      .single();

    if (errorGestor)
    {
      console.error("Error obteniendo gestor:", errorGestor.message);
      return;
    }

    this.orgId = gestorData.id_organizacion;

    const { data: extra, error: error } = await supabase
      .from('Organizaciones')
      .select('nombre_organizacion')
      .eq('id_organizacion', this.orgId)
      .single();

    this.gestor = {
      rol: gestorData.rol,
      organizacion: extra?.nombre_organizacion?.trim() || "null"
    };

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

  async verDetalle(id_reporte)
  {
    for (const reporte of this.reportes)
    {
      if(reporte.id_reporte == id_reporte)
      {
        this.reporteSeleccionado = { ...reporte };
        break;
      }
    }

    if(this.reporteSeleccionado === null)
    {
      return
    }
    this.vista = 'detalle'
    this.nota = '';
    this.nuevoEstado = reporteSeleccionado.estado;

    // Obtener lista de evidencias del reporte
    const { data: evidencias, error: errorEvidencias } = await supabase
      .from('Evidencias')
      .select('id_evidencia, tipo_evidencia, url_evidencia')
      .eq('id_reporte', reporteSeleccionado.id_reporte);

    if (errorEvidencias)
    {
      console.error('Error cargando evidencias del reporte:', errorEvidencias.message);
      this.evidenciasDelReporte = [];
      return;
    }

    const evidenciasProcesadas = [];

    for (const evidencia of evidencias)
    {
      const filePath = evidencia.url_evidencia.split("files")[1].slice(1); // Ej: 'evidencias/imagen123.txt'
      const filename = filePath.split('/')[1];
      const mime = getMimeTypeFromFilename(filename);

      try
      {
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('safereport.files')
          .download(filePath);

        if (downloadError)
        {
          console.error(`Error descargando ${filePath}:`, downloadError.message);
          continue;
        }

        const base64Text = await fileData.text(); // Leer contenido base64 directamente

        evidenciasProcesadas.push({
          filename,
          mime,
          base64: base64Text, // ya es base64
        });

      }
      catch (err)
      {
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

  async calcularEstadisticas()
  {
    this.stats.total = this.reportes.length;

    for (const r of this.reportes)
    {
      // Tipo de abuso
      this.stats.porTipo[r.tipo_abuso] = (this.stats.porTipo[r.tipo_abuso] || 0) + 1;

      // Estado del reporte
      this.stats.porEstado[r.estado_reporte] = (this.stats.porEstado[r.estado_reporte] || 0) + 1;

      // Fecha: por mes (YYYY-MM)
      const fecha = new Date(r.fecha_suceso.replace(" ", "T"));
      const mes = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`;
      this.stats.porMes[mes] = (this.stats.porMes[mes] || 0) + 1;
    }

  },

  cerrarSesion()
  {
    supabase.auth.signOut().then(() => {
      localStorage.clear();
      window.location.href = '/login.html';
    });
  }
};
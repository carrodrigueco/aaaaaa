import { supabase } from './cliente_superbase.js'
import {getMimeTypeFromFilename} from './cliente_backend'
 
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
  estados: ['Abierto', 'Cerrado', 'En revision', 'Reabierto'],
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
        .select('usuario_gestor, id_organizacion, rol_org')
        .eq('usuario_gestor', user.email)
        .single()

    if (errorGestor)
    {
      console.error("Error obteniendo gestor:", errorGestor.message);
      return;
    }

    this.orgId = gestorData.id_organizacion;

    const { data: extra, error: error } = await supabase
      .from('Organizaciones')
      .select('nombre_organizacion')
      .eq('id_organizaciones', this.orgId)
      .single();

    this.gestor = {
      rol: gestorData.rol_org,
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
    this.evidenciasDelReporte = [];
    this.nuevoEstado = this.reporteSeleccionado.estado_reporte;
    this.reporteSeleccionado.estado_reporte = this.estados[this.reporteSeleccionado.estado_reporte-1];
    // Obtener lista de evidencias del reporte
    const { data: evidencias, error: errorEvidencias } = await supabase
      .from('Evidencias')
      .select('id_evidencia, tipo_evidencia, url_evidencia')
      .eq('id_reporte', this.reporteSeleccionado.id_reporte);

    if (errorEvidencias)
    {
      console.error('Error cargando evidencias del reporte:', errorEvidencias.message);
      this.evidenciasDelReporte = [];
      return;
    }

    let index = 0;
    for (const evidencia of evidencias)
    {
      const filePath = evidencia.url_evidencia.split("files")[1].slice(1).split("?")[0]; // Ej: 'evidencias/imagen123.txt'
      const filename = filePath.split('/')[1];
      const mimo = getMimeTypeFromFilename(filename);

      try
      {
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('safereport.files')
          .download(filePath);

        if (downloadError) {
          console.error(`Error descargando ${filePath}:`, downloadError.message);
          return; // o continue si estás en un bucle
        }

        // Convertir Blob a base64 con FileReader
        const reader = new FileReader();

        reader.onload = () => {
          const result = reader.result; // ya es 'data:<mime>;base64,...'

          this.evidenciasDelReporte.push({
            filename: filename,
            mime: mimo,
            base64: result,
            index: index++
          });
        };

        reader.onerror = (e) => {
          console.error(`Error leyendo archivo ${filePath} como base64:`, e);
        };

        reader.readAsDataURL(fileData); // lee el blob como base64

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
      detalle: this.nota + "\n ESTADO CAMBIADO A "+ this.estados[parseInt(this.nuevoEstado)-1],
      fecha: new Date().toISOString(),
      id_reporte: id_reporte
    };

    
    const { error2 } = await supabase
    .from('Reportes')
    .update({estado_reporte: parseInt(this.nuevoEstado)})
    .eq('id_reporte', id_reporte);
    
    const { error } = await supabase
      .from('ActualizacionesReportes')
      .insert(updates);

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
    this.vista = "reportes";
  },

  async calcularEstadisticas()
  {
    this.stats = {
      total: 0,
      porTipo: {},
      porEstado: {},
      porMes: {}
    };
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
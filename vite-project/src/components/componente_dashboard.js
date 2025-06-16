import { supabase } from './cliente_superbase.js'

export const componente_dashboard = {
  vista: 'reportes',
  gestor: {
    nombre: '',
    rol: '',
    organizacion: '',
    foto: ''
  },
  reportes: [],
  reporteSeleccionado: null,
  nota: '',
  nuevoEstado: '',
  estados: ['Nuevo', 'En revisión', 'En progreso', 'Cerrado'],
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
      .select('usuario_gestor, rol, organizacion, foto, org_id')
      .eq('id', user.id)
      .single();

    if (errorGestor)
    {
      console.error("Error obteniendo gestor:", errorGestor.message);
      return;
    }

    if(gestorData == null)
    {
      gestorData == supabase.storage.from_("safereport.files").download("fotos_gestores/Avatar.png")
    }
    this.gestor = {
      nombre: gestorData.nombre,
      rol: gestorData.rol,
      organizacion: gestorData.organizacion,
      foto: gestorData.foto
    };

    this.orgId = gestorData.org_id;
    await this.cargarReportes();
    this.calcularEstadisticas();
  },

  async cargarReportes() {
    const { data, error } = await supabase
      .from('reportes')
      .select('*')
      .eq('org_id', this.orgId);

    if (error) {
      console.error('Error cargando reportes:', error.message);
      return;
    }

    this.reportes = data;
  },

  verDetalle(reporte) {
    this.reporteSeleccionado = { ...reporte };
    this.nota = '';
    this.nuevoEstado = reporte.estado;
  },

  async guardarCambios() {
    if (!this.reporteSeleccionado) return;

    const { id } = this.reporteSeleccionado;

    const updates = {
      estado: this.nuevoEstado,
      nota: this.nota,
      fecha_actualizacion: new Date().toISOString()
    };

    const { error } = await supabase
      .from('reportes')
      .update(updates)
      .eq('id', id);

    if (error) {
      alert('Error al guardar los cambios');
      console.error(error);
      return;
    }

    alert('Cambios guardados correctamente');
    this.reporteSeleccionado.estado = this.nuevoEstado;
    this.reporteSeleccionado.nota = this.nota;

    await this.cargarReportes();
    this.calcularEstadisticas();
  },

  imprimir() {
    window.print();
  },

  async calcularEstadisticas() {
    const total = this.reportes.length;
    const cerrados = this.reportes.filter(r => r.estado === 'Cerrado').length;
    const enProgreso = this.reportes.filter(r => r.estado === 'En progreso').length;

    this.estadisticas = {
      total,
      cerrados,
      enProgreso
    };
  },

  cerrarSesion() {
    supabase.auth.signOut().then(() => {
      localStorage.clear();
      window.location.href = '/login.html';
    });
  }
};
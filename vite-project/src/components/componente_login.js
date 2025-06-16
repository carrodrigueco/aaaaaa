import { supabase } from './cliente_superbase.js'
import { redirect_page } from './cliente_backend.js';

export const componente_login = {
  username: '', // Puede ser un correo si usas email como login
  password: '',
  errorMsg: '',

  async handleLogin()
  {
    this.errorMsg = '';

    if (!this.username || !this.password) {
      this.errorMsg = 'Todos los campos son obligatorios.';
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: this.username,
      password: this.password,
    });

    
    if (error)
    {
      console.error(error);
      this.errorMsg = 'Credenciales inválidas o cuenta no verificada.';
      return;
    }
    
    // Redirigir a página protegida
    redirect_page('dashboard_gestor');
  }
};
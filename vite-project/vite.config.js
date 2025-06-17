// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path'; // Importa 'resolve' para manejar rutas absolutas
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Configuración general de Vite
  plugins: [tailwindcss(),], // Agrega aquí cualquier plugin de Vite que necesites (ej. @vitejs/plugin-vue)

  // Opciones de construcción (build options)
  build: {
    // Configuración específica de Rollup (que Vite usa internamente para la construcción)
    rollupOptions: {
      input: {
        // Define cada archivo HTML como un punto de entrada.
        // La clave (ej. 'buscar_reporte') será el nombre del archivo de salida en 'dist/'.
        // El valor es la ruta absoluta al archivo HTML.
        buscar_reporte: resolve(__dirname, 'src/buscar_reporte.html'),
        crear_reporte: resolve(__dirname, 'src/crear_reporte.html'),
        dashboard_gestor: resolve(__dirname, 'src/dashboard_gestor.html'),
        login: resolve(__dirname, 'src/login.html'),
        // Si tu index.html está en la raíz, o en otra ubicación, también añádelo aquí si quieres que Vite lo procese:
        main: resolve(__dirname, 'index.html'), // Asumiendo que index.html está en la raíz del proyecto
      },
      // Puedes configurar la salida (output) si necesitas más control,
      // pero por defecto, Vite creará una carpeta 'dist/' con los archivos HTML y sus activos.
      // output: {
      //   // Ejemplo de cómo nombrar los archivos de salida
      //   entryFileNames: `assets/[name].[hash].js`,
      //   chunkFileNames: `assets/[name].[hash].js`,
      //   assetFileNames: `assets/[name].[hash].[ext]`
      // }
    },
    // Directorio de salida para la construcción (por defecto es 'dist')
    // outDir: 'dist',
  },
});
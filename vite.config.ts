import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Configurações de otimização
    target: 'es2015',
    minify: 'terser',
    sourcemap: false,
    
    // Configurações de code splitting
    rollupOptions: {
      output: {
        // Separar chunks por dependências
        manualChunks: {
          // Vendor chunk - bibliotecas principais
          vendor: ['react', 'react-dom', 'react-router-dom'],
          
          // Supabase chunk
          supabase: ['@supabase/supabase-js'],
          
          // UI libraries chunk
          ui: ['@heroicons/react', '@dnd-kit/core', '@dnd-kit/sortable'],
          
          // Calendar chunk (pode ser grande)
          calendar: ['react-big-calendar', 'date-fns'],
        },
        
        // Naming para chunks
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '') : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        
        // Naming para assets
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // Configurações de chunks
    chunkSizeWarningLimit: 1000,
    
    // Otimizações de bundle
    cssCodeSplit: true,
    
    // Configurações de terser para minificação
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log em produção
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    }
  },
  
  // Configurações de desenvolvimento
  server: {
    port: 5173,
    host: true
  },
  
  // Otimizações de dependências
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      '@supabase/supabase-js',
      'react-big-calendar',
      'date-fns'
    ]
  },
  
  // Configurações de preview
  preview: {
    port: 4173,
    host: true
  }
})

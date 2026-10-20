import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Habilita HTTPS local quando `npm run dev:https` (ou VITE_HTTPS=true) é usado.
// A Meta (FB Embedded Signup) exige HTTPS, então este modo é necessário para
// testar o fluxo localmente. Em produção o TLS é terminado pelo Traefik.
const useHttps = process.env.VITE_HTTPS === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(useHttps ? [basicSsl()] : []),
    VitePWA({
      registerType: 'prompt', // Mudado para prompt para notificar usuário sobre atualizações
      // SW próprio (src/sw.ts) para suportar Web Push; precache e runtime caching vivem lá.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'Aucta CRM',
        short_name: 'Aucta',
        description: 'Sistema de Gestão de Relacionamento com Cliente',
        theme_color: '#ff6600',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
      },
      devOptions: {
        enabled: true, // Habilita PWA no modo dev para testes
        type: 'module'
      }
    })
  ],
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

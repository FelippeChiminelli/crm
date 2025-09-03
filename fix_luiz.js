// Script para testar correção manual do usuário Luiz
// Execute no console do navegador

async function fixLuizProfile() {
  try {
    console.log('🔧 Corrigindo perfil do Luiz...');
    
    // Importar a função de correção
    const { fixUserProfile } = await import('./src/services/fixUserProfiles.ts');
    
    // UUID do Luiz
    const luizUuid = '4e90485f-6eab-4b75-933c-768dd2cf73b2';
    
    // Corrigir como VENDEDOR
    const result = await fixUserProfile(luizUuid, 'VENDEDOR');
    
    console.log('✅ Luiz corrigido:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Erro ao corrigir Luiz:', error);
    throw error;
  }
}

// Executar
fixLuizProfile();

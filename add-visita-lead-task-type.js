/**
 * Script para adicionar o tipo de tarefa "Visita Lead"
 * 
 * INSTRUÇÕES:
 * 1. Faça login no sistema CRM (http://localhost:5173)
 * 2. Abra o console do navegador (F12 > Console)
 * 3. Copie e cole o código abaixo no console
 * 4. Pressione Enter
 * 
 * O script irá adicionar automaticamente o novo tipo de tarefa "Visita Lead"
 */

// ==================== COLE O CÓDIGO ABAIXO NO CONSOLE ====================

(async function adicionarVisitaLead() {
  const SUPABASE_URL = 'https://dcvpehjfbpburrtviwhq.supabase.co';
  const authToken = localStorage.getItem('supabase.auth.token');
  
  if (!authToken) {
    console.error('❌ Token de autenticação não encontrado. Faça login primeiro!');
    return;
  }
  
  let accessToken;
  try {
    const tokenData = JSON.parse(authToken);
    accessToken = tokenData.access_token;
  } catch (e) {
    console.error('❌ Erro ao parsear token:', e);
    return;
  }
  
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdnBlaGpmYnBidXJydHZpd2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNTczOTksImV4cCI6MjA0OTkzMzM5OX0.Zp3yZBqFxeaPCl7ioKWw-H2j79NJ7KHtVVYy0rX-ozk';
  
  console.log('🚀 Iniciando criação do tipo de tarefa "Visita Lead"...');
  
  try {
    // 1. Obter dados do usuário
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!userResponse.ok) {
      console.error('❌ Erro ao buscar usuário');
      return;
    }
    
    const userData = await userResponse.json();
    const userId = userData.id;
    console.log('✅ Usuário ID:', userId);
    
    // 2. Buscar empresa_id do usuário
    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?uuid=eq.${userId}&select=empresa_id`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!profileResponse.ok) {
      console.error('❌ Erro ao buscar perfil');
      return;
    }
    
    const profiles = await profileResponse.json();
    if (!profiles || profiles.length === 0) {
      console.error('❌ Perfil não encontrado');
      return;
    }
    
    const empresaId = profiles[0].empresa_id;
    console.log('✅ Empresa ID:', empresaId);
    
    // 3. Verificar se já existe
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/task_types?name=eq.Visita Lead&empresa_id=eq.${empresaId}`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const existing = await checkResponse.json();
    if (existing && existing.length > 0) {
      console.log('⚠️ O tipo de tarefa "Visita Lead" já existe!');
      console.log('📋 Dados existentes:', existing[0]);
      return;
    }
    
    // 4. Criar novo tipo de tarefa
    const createResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/task_types`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: 'Visita Lead',
          color: '#6366F1',
          icon: '🏢',
          empresa_id: empresaId,
          active: true
        })
      }
    );
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('❌ Erro ao criar tipo de tarefa:', errorText);
      return;
    }
    
    const newTaskType = await createResponse.json();
    console.log('✅ Tipo de tarefa "Visita Lead" criado com sucesso!');
    console.log('📋 Dados:', newTaskType[0]);
    console.log('');
    console.log('🎉 Agora você pode usar o tipo "Visita Lead" nas suas tarefas e automações!');
    console.log('🔄 Recarregue a página para ver o novo tipo de tarefa');
    
  } catch (error) {
    console.error('❌ Erro ao executar script:', error);
  }
})();

// ==========================================================================

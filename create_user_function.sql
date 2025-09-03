-- Função para corrigir usuário recém-criado
-- Execute este SQL no Supabase para criar uma função que corrija os usuários

CREATE OR REPLACE FUNCTION public.fix_user_profile(
  user_uuid UUID,
  user_empresa_id UUID,
  user_role_id UUID DEFAULT NULL,
  user_is_admin BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Tentar atualizar o perfil do usuário
  UPDATE public.profiles 
  SET 
    empresa_id = user_empresa_id,
    role_id = user_role_id,
    is_admin = user_is_admin,
    updated_at = NOW()
  WHERE uuid = user_uuid;
  
  -- Verificar se a atualização foi bem-sucedida
  IF FOUND THEN
    -- Buscar o perfil atualizado
    SELECT jsonb_build_object(
      'success', true,
      'message', 'Perfil atualizado com sucesso',
      'uuid', uuid,
      'empresa_id', empresa_id,
      'role_id', role_id,
      'is_admin', is_admin
    ) INTO result
    FROM public.profiles 
    WHERE uuid = user_uuid;
  ELSE
    result := jsonb_build_object(
      'success', false,
      'message', 'Usuário não encontrado'
    );
  END IF;
  
  RETURN result;
END;
$$;

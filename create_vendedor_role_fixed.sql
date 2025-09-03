-- Criar role Vendedor para a empresa específica
INSERT INTO roles (name, description, empresa_id, is_system_role, is_active) 
SELECT 'Vendedor', 'Vendedor com acesso limitado conforme permissões', 'a08ec00e-fe7e-4299-9954-29a12bc4e016', true, true
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE name = 'Vendedor' AND empresa_id = 'a08ec00e-fe7e-4299-9954-29a12bc4e016'
);

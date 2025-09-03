-- Criar role Vendedor se não existir
INSERT INTO roles (name, description, is_system_role, is_active) 
SELECT 'Vendedor', 'Vendedor com acesso limitado conforme permissões', true, true
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE name = 'Vendedor'
);

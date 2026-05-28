-- Correção de login PDV MILLER MOTOS
-- Rode no SQL Editor do Supabase para garantir os usuários padrão.

insert into public.mm_pdv_usuarios (project_id, id, nome, login, senha, perfil, ativo)
values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','U001','Administrador','admin','admin123','administrador',true),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','U002','Financeiro','financeiro','fin123','financeiro',true),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','U003','Vendedor','vendedor','venda123','vendedor',true)
on conflict (project_id, login) do update set
  nome = excluded.nome,
  id = excluded.id,
  senha = excluded.senha,
  perfil = excluded.perfil,
  ativo = true,
  updated_at = now();

select login, senha, perfil, ativo from public.mm_pdv_usuarios
where project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026'
order by perfil, login;

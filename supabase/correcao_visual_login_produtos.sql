-- Correção visual/login PDV MILLER MOTOS
-- Rode depois do schema principal, se quiser reforçar os usuários iniciais e corrigir produtos sem nome.

update public.mm_pdv_produtos
set nome = codigo
where project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026'
  and (nome is null or trim(nome) = '');

insert into public.mm_pdv_usuarios (project_id, id, nome, login, senha, perfil, ativo)
values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','U001','Administrador','admin','admin123','administrador',true),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','U002','Financeiro','financeiro','fin123','financeiro',true),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','U003','Vendedor','vendedor','venda123','vendedor',true)
on conflict (project_id, id) do update set
  nome = excluded.nome,
  login = excluded.login,
  senha = excluded.senha,
  perfil = excluded.perfil,
  ativo = excluded.ativo,
  updated_at = now();

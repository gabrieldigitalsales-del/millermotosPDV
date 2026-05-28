# Supabase - PDV MILLER MOTOS

Esta versão mantém o layout clássico do ZIP enviado pelo usuário, mas remove o uso de `localStorage` para os dados do sistema.

## Como configurar

1. Abra seu projeto no Supabase.
2. Vá em **SQL Editor**.
3. Execute o arquivo `supabase/schema_miller_motos.sql`.
4. No Vercel, configure as variáveis de ambiente:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLIC
VITE_MM_PROJECT_ID=9f1f4df2-5f5a-4a7d-9f34-8a9be4412026
```

## O que salva no Supabase

- Configurações da empresa e chave Pix
- Usuários e permissões
- Clientes
- Fornecedores
- Vendedores
- Produtos e estoque
- Vendas e itens vendidos
- Movimentos de entrada e saída do estoque

## Observação

A sessão do usuário logado ainda usa `sessionStorage`, apenas para não pedir login a cada atualização da página. Os dados comerciais ficam no Supabase.

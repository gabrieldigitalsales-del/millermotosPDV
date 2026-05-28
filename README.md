# PDV MILLER MOTOS - Supabase direto

Esta versão remove o modo local como padrão. Clientes, produtos, vendas, estoque, fornecedores, vendedores, configurações e relatórios usam o Supabase diretamente.

## Antes de publicar no Vercel

1. No Supabase, abra SQL Editor.
2. Cole e execute `supabase/schema_miller_motos.sql`.
3. No Vercel, configure as variáveis:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLIC
VITE_MM_PROJECT_ID=9f1f4df2-5f5a-4a7d-9f34-8a9be4412026
```

4. Faça novo deploy.

## Acessos iniciais

- admin / admin123
- financeiro / fin123
- vendedor / venda123

## Ajustes desta versão

- Salvamento direto no Supabase.
- Sem localStorage como banco principal.
- Balcão mostra pré-itens antes de pesquisar.
- Linha amarela ajustada para: ⭐ Produtos mais vendidos
- Busca sem acento e em tempo real.
- Venda baixa estoque e gera movimento de saída.
- Entrada de estoque manual.
- Relatórios completos.
- Controle de permissões por perfil.

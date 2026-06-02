# Alterações aplicadas

## O que foi corrigido/adicionado

1. **QR Code Pix dinâmico**
   - O QR Code do PDV agora muda conforme valor da venda, valor pago em Pix, cliente e chave Pix.
   - A tela `Pix / QR Code` foi recriada para gerar QR por valor e referência.

2. **Login inicial com vendedor**
   - O login padrão `vendedor / venda123` continua funcionando.
   - Para vendedor, o sistema inicia com acesso ao PDV, mas sem acesso ao histórico de vendas por padrão.

3. **Aba Histórico de Vendas proibida para vendedor**
   - A opção `Histórico de Vendas` é ocultada/bloqueada para o perfil vendedor.
   - Permissões podem ser mudadas pelo administrador em Configurações.

4. **Permissões por login**
   - Na criação/edição de usuários, foram adicionadas opções para marcar o que cada login pode acessar:
     - Vender no PDV
     - Clientes
     - Produtos
     - Estoque
     - Histórico de vendas
     - Pix / QR Code
     - Financeiro
     - Relatórios
     - Fornecedores
     - Vendedores
     - Configurações
     - Backup
   - O sistema bloqueia login duplicado antes de salvar, evitando erro de unique/duplicidade no Supabase.

5. **Filtros no histórico de vendas**
   - Filtro por texto, data inicial/final, valor mínimo/máximo, vendedor, comprador, pagamento e status.

6. **Mais de um meio de pagamento na venda balcão**
   - A venda permite combinar Dinheiro, Pix, Cartão Débito, Cartão Crédito e Fiado.
   - O sistema valida que a soma dos pagamentos fecha exatamente o total da venda.
   - O cupom imprime a composição dos pagamentos.

7. **Correção de venda/login no Supabase**
   - Foi adicionado o arquivo `supabase/correcao_permissoes_pagamentos_vendas.sql`.
   - Esse SQL cria colunas de permissão por login e remove o trigger antigo que podia baixar estoque de novo quando os itens da venda eram regravados.

## Importante antes de publicar

Rode no Supabase, uma única vez, o arquivo:

`supabase/correcao_permissoes_pagamentos_vendas.sql`

Depois publique a nova versão normalmente (`npm run build`, Vercel, Netlify etc.).

## Upgrades sugeridos próximos

- Autenticação real com Supabase Auth em vez de senha salva em tabela simples.
- PIX copia-e-cola EMV oficial para QR Pix bancário completo.
- Log/auditoria de quem criou, editou e cancelou cada venda.
- Tela de contas a receber para vendas em fiado.
- Sangria/suprimento/fechamento de caixa por operador.
- Impressão térmica com layout configurável por tamanho de bobina.
- Controle de comissões por vendedor.
- Relatório de curva ABC e margem por produto.
- Backup automático/exportação agendada.
- Políticas RLS mais rígidas no Supabase por perfil.

## Correção adicional - duplicate key em usuários

Foi corrigido o salvamento de usuários/configurações para não reenviar o `id` antigo ao Supabase. Agora o app usa `upsert` por `project_id + login`, evitando o erro:

`duplicate key value violates unique constraint "mm_pdv_usuarios_pkey"`

SQL adicional incluído:

`supabase/correcao_usuarios_duplicate_key.sql`

## Versão v3 - QR Code Pix oficial

- Troquei a geração simples do QR por Pix oficial.
- O payload agora inclui `BR.GOV.BCB.PIX`, valor, cidade, nome do recebedor e TXID.
- O app mostra aviso quando a chave Pix parece inválida.
- Formatos aceitos de chave Pix: CPF somente números, CNPJ somente números, e-mail, UUID ou telefone no formato `+55DDDNUMERO`.

Exemplo de telefone válido: `+5531999999999`.

## v4 - Login vendedor primeiro
- A tela inicial agora abre preenchida com login `vendedor` e senha `venda123`.
- A ordem dos usuários padrão foi alterada para mostrar/validar vendedor antes do administrador.
- A mensagem de erro de login agora apresenta vendedor primeiro.


## V6 - Correção de deadlock no Supabase

- Salvamentos no Supabase agora entram em fila, evitando que vendas, produtos e movimentos sejam gravados ao mesmo tempo.
- Adicionado retry automático quando o Supabase retorna `deadlock detected`.
- Adicionado SQL `supabase/correcao_deadlock_vendas.sql` para remover triggers antigas de baixa de estoque que podem causar travamento ou baixa duplicada.

## v6 - Correção de deadlock Supabase

- Adicionada fila de salvamento no app para impedir gravações simultâneas no Supabase.
- Alterado salvamento de vendas para atualizar por `project_id + numero`, sem apagar e recriar todas as vendas a cada alteração.
- Criado SQL `supabase/correcao_deadlock_vendas.sql` para remover trigger antigo de baixa de estoque e garantir índice único da venda.

## v7 - Reset completo do Supabase

Incluído reset completo do banco em `supabase/sql_reset_completo_miller_motos_final.sql`.
Esse SQL apaga e recria as tabelas `mm_pdv_*` com todos os defaults de UUID, permissões, constraints únicas usadas pelo app e sem trigger de baixa automática de estoque para evitar deadlock/baixa duplicada.

# Retomada automática de conversas paradas — design

Data: 2026-11-14 · Status: aprovado em conversa, aguardando revisão da spec

## Objetivo

Além de mostrar leads sem contato (tela "Sem contato"), o CRM passa a **retomar a
conversa sozinho pelo WhatsApp, pelo número do vendedor responsável**, enviando
direto (sem aprovação manual).

## Regra máxima (invariante)

**Toda retomada sai da instância do vendedor responsável pelo lead — sempre.**
Uma instância só é usada se `whatsapp_instances.default_responsible_uuid = leads.responsible_uuid`
no momento da seleção **e** no momento do envio. Consequências:

- Lead sem responsável, ou cujo responsável não tem instância conectada → **não é retomado**
  (nunca há fallback para instância de outro vendedor, da empresa ou da última conversa).
- Conversa existente em instância de outro vendedor é ignorada; a conversa usada é sempre
  a da instância escolhida (criada se não existir).
- Se o responsável do lead mudar, ou a instância trocar de dono, entre a seleção e o envio,
  o item é pulado no n8n (`retomada_ainda_elegivel` = false).
- O filtro "respondeu" e a escolha entre vários números do vendedor operam **dentro** do
  conjunto de instâncias dele; nunca ampliam esse conjunto.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Onde configura | Novo gatilho **"Lead sem contato"** em Automações (motor de tempo existente) |
| Ritmo de envio | A Edge Function manda a rajada para um **fluxo n8n dedicado** ("Retomada CRM"), que envia um por vez com `wait` aleatório entre envios |
| Número do vendedor | `whatsapp_instances.default_responsible_uuid` (já preenchido em 110/167 instâncias) |
| Vendedor com vários números | 1º o número dele onde o lead conversou por último; senão, rodízio entre os números conectados dele dentro do disparo |
| Provedor | **Só uazapi na v1.** Vendedor apenas com Cloud API → lead pulado ("requer template"). Templates ficam para v2 |
| Filtro "respondeu" | O lead tem ≥1 mensagem **`outbound`** na conversa **da instância que vai disparar**. Convenção do chat: `inbound` = vendedor, `outbound` = lead |
| Frequência | **1 disparo por dia por regra**, dentro da janela de horário/dias |
| Textos | Até **3 variações**, sorteadas por envio |

## Arquitetura e fluxo

```
pg_cron (*/10) → Edge Function handle-time-automation
  regra event_type = 'lead_sem_contato'
    0. está na schedule_window e a regra ainda não disparou hoje? senão, sai
    1. RPC _retomada_candidatos(...)  → leads + instância + conversa (já limitado)
    2. para cada candidato sem conversa naquela instância: cria conversa (helper existente)
    3. monta o texto: sorteia variação + interpola variáveis
    4. agrupa por instance_id → 1 POST por número → n8n /webhook/retomada_crm
    5. POST ok   → upsert automation_executions (tentativas+1, next_eligible_at)
                   + automation_run_log 'success' { enviado_ao_n8n, instance_id }
       POST erro → nada marcado (volta no próximo dia) + automation_run_log 'error'
    6. automations.ultimo_disparo_em = hoje (fuso da janela)

n8n "Retomada CRM" (uma execução por número, em paralelo entre números)
  loop itens (um por vez):
    → RPC retomada_ainda_elegivel(lead_id, instance_id, disparo_em) — false? registra 'skipped' e segue
    → envia texto (mesma lógica do msginterna_crm, uazapi)
    → RPC registrar_retomada(lead_id, rule_id, instance_id, status, detalhe)
    → wait aleatório entre wait_min_s e wait_max_s
```

Por que 1 POST por número: cada número vira execução própria no n8n e roda em
paralelo; um loop único serializaria todos os vendedores (10 × 20 leads × 2 min ≈ 7 h).

Por que 1x por dia: com o cron a cada 10 min, sem essa trava uma nova rajada sairia
enquanto o n8n ainda envia a anterior.

## Configuração da regra (`automations.condition`)

| Campo UI | Chave | Notas |
|---|---|---|
| Dias parado mín. | `dias_parado` (int ≥ 1) | Mesma regra de `_leads_sem_contato` |
| Dias parado máx. (opcional) | `max_dias_parado` | |
| Responsáveis | `responsible_ids: uuid[]` | Vazio = todos. Leads sem responsável nunca entram |
| Limite por disparo | `max_per_run` (existente) | Total por disparo; excedente fica para o próximo dia |
| Público | `publico: 'todos' \| 'respondeu'` | Ver definição de "respondeu" acima |
| Horário/dias | `schedule_window` (existente) | Obrigatório neste gatilho |
| Não retomar o mesmo lead por | `recurring_interval_value/unit` (existente) | Ex.: 7 dias |
| Máx. tentativas por lead | `max_tentativas` (int, padrão 2) | |
| Intervalo entre envios | `wait_min_s`, `wait_max_s` (padrão 60/180) | Repassado ao n8n |
| Pipelines/etapas (opcional) | `pipeline_ids`, `stage_ids` (existente) | |

Ação `send_whatsapp`:
- Nova opção `instance_mode: 'responsible'` ("Número do responsável"), disponível
  e obrigatória só no gatilho `lead_sem_contato`; oculta o seletor de instância fixa.
- `message_variants: string[]` (1 a 3). `message_template` continua aceito como variante única.
- Só texto na v1 (`wa_message_type = 'text'`).
- Nova variável `{vendedor}` = primeiro nome do responsável, além das atuais
  (`{primeiro_nome}`, `{nome_lead}`, …).

## Banco (1 migration)

1. `automation_executions.tentativas int not null default 0`.
2. `automations.ultimo_disparo_em date` (trava de 1x/dia).
3. `_retomada_candidatos(p_empresa_id, p_rule_id, p_dias_parado, p_max_dias_parado,
   p_responsible_ids uuid[], p_pipeline_ids uuid[], p_stage_ids uuid[],
   p_publico text, p_max_tentativas int, p_limit int)`
   → `(lead_id, nome, telefone, responsavel_id, responsavel_nome, instance_id, conversation_id)`
   - base: `_leads_sem_contato(empresa, now() - dias, ...)`, excluindo responsável nulo;
   - exclui leads com `automation_executions` desta regra com `next_eligible_at > now()`
     ou `tentativas >= p_max_tentativas`;
   - instâncias elegíveis: `whatsapp_instances` com `default_responsible_uuid = responsável`
     e `status in ('connected','open')` (tabela só contém uazapi);
   - escolha: instância com a conversa mais recente com o lead (`chat_conversations.lead_id`
     ou `fone` = telefone normalizado); sem conversa → rodízio entre as elegíveis
     (`row_number() over (partition by responsável)`);
   - `publico = 'respondeu'`: exige `chat_messages.direction = 'outbound'` em conversa
     do lead **naquela** instância (e nesse caso a escolha considera só essas instâncias);
   - leads sem instância elegível não retornam; o motivo agregado vai para o log da regra;
   - ordenação: mais antigo parado primeiro; `limit p_limit`.
   - `security definer`, `revoke` de `anon`/`authenticated` (só service role).
4. `retomada_ainda_elegivel(p_lead_id, p_instance_id, p_desde timestamptz) returns boolean`
   — false se: lead vendido/perdido; lead sem responsável; `default_responsible_uuid` da
   instância ≠ `responsible_uuid` atual do lead; instância não conectada; ou qualquer
   mensagem (qualquer direção, qualquer instância) após `p_desde`. Só service role.
5. `registrar_retomada(p_lead_id, p_rule_id, p_instance_id, p_status, p_detalhe jsonb)`
   — insere em `automation_run_log` (`action_type = 'retomada_whatsapp'`) e em
   `lead_pipeline_history` (`change_type = 'retomada_automatica'`) quando `success`.
   Só service role.

## Contrato Edge → n8n

`POST {N8N_BASE_URL}/webhook/retomada_crm` com header `x-internal-secret`:

```json
{
  "empresa_id": "uuid", "rule_id": "uuid", "rule_name": "texto",
  "instance_id": "uuid", "disparo_em": "ISO-8601",
  "wait_min_s": 60, "wait_max_s": 180,
  "itens": [
    { "lead_id": "uuid", "conversation_id": "uuid", "content": "texto final", "tentativa": 1 }
  ]
}
```

O n8n responde 200 assim que recebe (o loop roda em seguida); a Edge Function não espera os envios.

## Erros

| Situação | Comportamento |
|---|---|
| POST ao n8n falha / timeout | Leads daquele número não marcados; `automation_run_log` 'error'; voltam no próximo disparo |
| Envio falha no loop | n8n chama `registrar_retomada(..., 'error', {motivo})` e segue |
| Lead respondeu durante o loop | `retomada_ainda_elegivel` = false → 'skipped' |
| Responsável do lead mudou (ou instância trocou de dono) durante o loop | `retomada_ainda_elegivel` = false → 'skipped' { motivo: 'instancia_nao_e_do_responsavel' } |
| Vendedor sem número uazapi conectado | Lead não é candidato; contagem no log da regra |
| Regra sem `schedule_window` | Bloqueado na validação do formulário |

## Fora do escopo (v1)

Templates da Cloud API · mídia na retomada · mensagens geradas por IA · indicador de
taxa de resposta (os dados ficam em `automation_run_log` para uma v2) · correção do
`send_whatsapp` genérico que hoje usa sempre o webhook uazapi.

## Testes

- `_retomada_candidatos` em modo leitura contra uma empresa real, conferindo com a tela Sem contato.
- Teste da invariante: nenhum candidato retornado pode ter `instance_id` cujo
  `default_responsible_uuid` ≠ `responsavel_id` (query de verificação = 0 linhas);
  lead com conversa só em instância de outro vendedor não pode sair por ela.
- Teste ponta a ponta: regra com 1 responsável de teste, limite 1, telefone próprio;
  trocar o responsável do lead antes do envio e confirmar que vira 'skipped'.
- `npm run build` (typecheck + build) e lint do frontend.
- Fluxo n8n criado como rascunho (não publicado) para revisão do usuário.

## Arquivos afetados

- `supabase` (migration nova — repositório de migrations do projeto)
- Edge Function `handle-time-automation` (novo processador `lead_sem_contato`)
- `src/types/index.ts` (`event_type`, campos da ação)
- `src/components/empresa/automations/triggers.ts`, `constants.ts`, `validation.ts`,
  `formatters/conditionText.ts`, `formatters/ruleSentence.ts`
- `src/components/empresa/automations/conditions/LeadSemContatoConditions.tsx` (novo)
- `src/components/empresa/automations/actions/WhatsAppActionForm.tsx` (modo responsável + variações)
- n8n: workflow novo "Retomada CRM"

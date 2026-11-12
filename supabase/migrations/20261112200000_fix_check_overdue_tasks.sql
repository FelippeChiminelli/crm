-- Correção do check_overdue_tasks: comparava due_date (data à meia-noite UTC)
-- com now(), ignorando due_time. Toda tarefa que vence hoje virava "atrasada"
-- em qualquer edição feita durante o dia. Passa a usar o prazo real
-- (data + hora, fuso de Brasília) via tarefa_prazo(), a mesma regra dos lembretes.

create or replace function public.check_overdue_tasks()
returns trigger
language plpgsql
as $$
BEGIN
  -- Marcar como atrasada se passou do prazo (data + hora) e não está concluída
  IF NEW.due_date IS NOT NULL
     AND public.tarefa_prazo(NEW.due_date, NEW.due_time) < now()
     AND NEW.status NOT IN ('concluida', 'cancelada')
     AND OLD.status != 'atrasada' THEN
    NEW.status = 'atrasada';
  END IF;

  -- Marcar como concluída e registrar timestamp
  IF NEW.status = 'concluida' AND OLD.status != 'concluida' THEN
    NEW.completed_at = timezone('utc'::text, now());
  END IF;

  -- Marcar como em andamento e registrar timestamp
  IF NEW.status = 'em_andamento' AND OLD.status = 'pendente' THEN
    NEW.started_at = timezone('utc'::text, now());
  END IF;

  RETURN NEW;
END;
$$;

-- Tarefas marcadas como atrasadas indevidamente (prazo ainda não passou) voltam a pendente.
update public.tasks
   set status = 'pendente'
 where status = 'atrasada'
   and due_date is not null
   and public.tarefa_prazo(due_date, due_time) > now();

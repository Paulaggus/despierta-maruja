-- =====================================================================
--  DESPIERTA MARUJA · Autorizar la cuenta familiar
-- ---------------------------------------------------------------------
--  Ejecuta esto DESPUÉS de crear el usuario familiar en
--  Authentication → Users → Add user.
--
--  Cambia el email de abajo por el que usaste al crear el usuario
--  (debe ser el mismo que pusiste en config.js).
-- =====================================================================

insert into public.allowed_users (user_id)
select id from auth.users where email = 'familia@despierta-maruja.es'
on conflict do nothing;

-- Comprobación: debe salir 1 fila con el email.
select u.email
from public.allowed_users a
join auth.users u on u.id = a.user_id;

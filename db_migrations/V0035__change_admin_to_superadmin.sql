-- Change admin role to superadmin for main administrator
-- superadmin = главный администратор (высший уровень)
-- admin = администратор предприятия

UPDATE t_p80499285_psot_realization_pro.users 
SET role = 'superadmin'
WHERE email = 'Gl.adm@adm.ru';
UPDATE t_p80499285_psot_realization_pro.wr_employees SET sort_order = CASE id
  WHEN 1103 THEN 1   -- Ведущий геолог на поверхности
  WHEN 1106 THEN 2   -- Начальник фабрики
  WHEN 1107 THEN 3   -- Заместитель начальника фабрики
  WHEN 1121 THEN 4   -- Гидротехник
  WHEN 1111 THEN 5   -- Главный маркшейдер
  WHEN 1122 THEN 6   -- Фельдшер
  WHEN 1115 THEN 7   -- Начальник лаборатории
  WHEN 1105 THEN 8   -- Начальник ОКС
  WHEN 1123 THEN 9   -- Заведующий складом(центральный)
  WHEN 1112 THEN 10  -- Кладовщик (грузчик)
  WHEN 1116 THEN 11  -- Оператор АЗС
  WHEN 1119 THEN 12  -- Начальник ОТК
  WHEN 1109 THEN 13  -- Заместитель начальника ОТК
  WHEN 1110 THEN 14  -- Контролер ОТК
  WHEN 1114 THEN 15  -- Пробоотборщик ОТК
  WHEN 1104 THEN 16  -- Раздатчик ВМ
  WHEN 1120 THEN 17  -- Ламповщик
  WHEN 1113 THEN 18  -- Обмотчик элементов электрических машин
  WHEN 1117 THEN 19  -- Заведующий складом ВМ
  WHEN 1118 THEN 20  -- Заместитель генерального директора по БиС
  WHEN 1108 THEN 21  -- Инспектор БиС.
  ELSE sort_order
END
WHERE sheet_name = 'Периодичность МО';
-- Добавляем поля возраста в таблицу teams
ALTER TABLE teams 
ADD COLUMN age_range_min INTEGER,
ADD COLUMN age_range_max INTEGER,
ADD COLUMN age_display TEXT;

-- Устанавливаем значения по умолчанию для существующих команд
UPDATE teams 
SET 
  age_range_min = 8, 
  age_range_max = 10, 
  age_display = '8-10 лет'
WHERE age_range_min IS NULL;

-- Добавляем проверочные ограничения
ALTER TABLE teams 
ADD CONSTRAINT teams_age_range_valid 
CHECK (age_range_min >= 5 AND age_range_max <= 18 AND age_range_min <= age_range_max);

-- Добавляем индекс для быстрого поиска по возрасту
CREATE INDEX idx_teams_age_range ON teams(age_range_min, age_range_max); 
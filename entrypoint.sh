#!/bin/bash
set -e

# Вспомогательная функция: извлекает значение параметра из строки подключения.
# Формат: "server=HOST;port=PORT;database=DB;user=USER;password=PASS"
get_param() {
    echo "${ConnectionStrings__DefaultConnection}" \
        | tr ';' '\n' \
        | grep -i "^$1=" \
        | sed 's/^[^=]*=//'
}

DB_HOST=$(get_param "server")
DB_PORT=$(get_param "port")
DB_NAME=$(get_param "database")
DB_USER=$(get_param "user")
DB_PASS=$(get_param "password")

# Порт по умолчанию
DB_PORT="${DB_PORT:-3306}"

echo ">>> Ожидаем MySQL на $DB_HOST:$DB_PORT ..."
until mysqladmin ping \
    -h"$DB_HOST" \
    -P"$DB_PORT" \
    -u"$DB_USER" \
    -p"$DB_PASS" \
    --silent 2>/dev/null
do
    echo "    MySQL ещё не готов, ждём 3 секунды..."
    sleep 3
done
echo ">>> MySQL готов!"

# Проверяем, инициализирована ли база (считаем таблицы в схеме).
# Если таблиц нет — запускаем db_recipes.sql (создаёт таблицы + заполняет данными).
TABLE_COUNT=$(mysql \
    -h"$DB_HOST" \
    -P"$DB_PORT" \
    -u"$DB_USER" \
    -p"$DB_PASS" \
    --skip-column-names \
    -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME';" \
    2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -eq 0 ]; then
    echo ">>> Инициализируем базу данных..."
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" < /app/db_recipes.sql
    echo ">>> База данных инициализирована!"
else
    echo ">>> База уже инициализирована ($TABLE_COUNT таблиц), пропускаем."
fi

# Запускаем приложение (заменяем текущий процесс, чтобы Ctrl+C работал)
echo ">>> Запускаем RecipeApp..."
exec dotnet RecipeApp.dll
# Этап 1: сборка
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Копируем исходники сервера
COPY server/ ./

# Восстанавливаем зависимости и публикуем в Release
RUN dotnet restore RecipeApp.csproj
RUN dotnet publish RecipeApp.csproj -c Release -o /app/publish

# Этап 2: runtime-образ
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# Устанавливаем MySQL-клиент (нужен для инициализации БД при старте)
RUN apt-get update \
    && apt-get install -y --no-install-recommends default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# Копируем собранное приложение
COPY --from=build /app/publish .

# Копируем SQL-дамп инициализации БД (создаёт таблицы и заполняет данными)
COPY server/db_recipes.sql ./db_recipes.sql

# Копируем и делаем исполняемым entrypoint
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# ASP.NET Core по умолчанию слушает 8080 внутри контейнера
EXPOSE 8080

ENTRYPOINT ["./entrypoint.sh"]
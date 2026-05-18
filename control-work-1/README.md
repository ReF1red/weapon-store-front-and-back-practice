# Контрольная работа №1

Тема проекта: оружейный магазин.

Документация Swagger (practice-5 backend): `http://localhost:3000/api-docs`

## Структура практик

- `practice-1/` — Практика №1 (CSS-препроцессоры, карточка товара, SASS/SCSS).
- `practice-2/` — Практика №2 (Node.js + Express, CRUD API товаров, статический каталог).
- `practice-3/` — Практика №3 (отчёт и скриншоты тестирования API в Postman).
- `practice-4/backend` + `practice-4/frontend` — Практика №4 (API + React, связка клиент/сервер).
- `practice-5/backend` + `practice-5/frontend` — Практика №5 (расширенный REST API + Swagger/OpenAPI).

## Что реализовано по требованиям

1. Практика №1:
- Используется SASS/SCSS.
- Переработана карточка товара под новую тематику.

2. Практика №2:
- Реализован CRUD API для товаров.
- Сервер отдает данные каталога и статику.
- Добавлен скрипт запуска `npm start`.

3. Практика №3:
- Подготовлен отчёт `practice-3/practice-3.md`.
- Используются скриншоты запросов в `practice-3/screenshots`.

4. Практика №4:
- Backend и frontend разделены по папкам.
- Фронтенд обращается к API через `axios`.
- Реализованы операции Create/Read/Update/Delete.
- В каталоге не менее 10 товаров.
- Карточка товара содержит: название, категорию, описание, цену, остаток и изображение.

5. Практика №5:
- Бэкенд дополнен Swagger (`swagger-jsdoc` + `swagger-ui-express`).
- CRUD-операции задокументированы в JSDoc-аннотациях.
- Документация доступна по адресу `/api-docs`.

## Запуск

### Practice 1
Статическая страница: открыть `practice-1/index.html`.

### Practice 2
```bash
cd practice-2
npm start
```
Сервер: `http://localhost:3000`

### Practice 4
Backend:
```bash
cd practice-4/backend
npm start
```

Frontend:
```bash
cd practice-4/frontend
npm start
```

### Practice 5
Backend:
```bash
cd practice-5/backend
npm start
```
Swagger: `http://localhost:3000/api-docs`

Frontend:
```bash
cd practice-5/frontend
npm start
```

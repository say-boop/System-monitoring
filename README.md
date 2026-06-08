# 🖥️ System Monitor

Веб-дашборд для мониторинга системы в реальном времени. Показывает загрузку CPU, память, диск, сеть и топ процессов.

---

## ✨ Возможности

- ⚡ **Загрузка CPU** — общая и по каждому ядру
- 📈 **График истории CPU** — последние 30 секунд
- 🧠 **Оперативная память** — всего, доступно, процент использования
- 💾 **Диск** — всего, занято, свободно, процент заполнения
- 🌐 **Сеть** — отправлено и принято в MB
- 📋 **Топ-5 процессов** по загрузке CPU
- 🔄 **Real-time обновление** через WebSocket без перезагрузки страницы

---

## 🛠️ Технологии

| Технология | Назначение |
|------------|------------|
| **Python 3.12** | Язык разработки |
| **FastAPI** | Веб-фреймворк и WebSocket |
| **psutil** | Сбор системных метрик |
| **Jinja2** | HTML-шаблоны |
| **Chart.js** | Графики на фронтенде |
| **Poetry** | Управление зависимостями |

---

## 🚀 Установка и запуск

### Предварительные требования

- Python 3.12 или выше
- [Poetry](https://python-poetry.org/docs/#installation)

### Установка

```bash
# Клонирование репозитория
git clone https://github.com/your-username/system-monitor.git
cd system-monitor

# Установка зависимостей
poetry install
```

### Запуск

```bash
poetry run uvicorn app.main:app --reload
```
Открыть в браузере: http://127.0.0.1:8000

---

### API Эндпоинты

| Метод | Путь | Описание |
|------------|------------|------------|
| **GET** | `/` | Главная страница дашборда |
| **GET** | `/api/health` | Все метрики системы в JSON |
| **WebSocket** | `/ws/metrics` | Real-time поток метрик (обновление раз в секунду) |

---

### Пример ответа /api/health

```json
{
  "cpu_percent": 12.5,
  "cpu_per_core": [10.2, 15.8, 8.1, 11.3],
  "memory_total": 31.85,
  "memory_available": 18.42,
  "memory_percent": 42.1,
  "disk_total": 475.62,
  "disk_used": 245.18,
  "disk_free": 230.44,
  "disk_percent": 51.5,
  "net_mb_sent": 1250.34,
  "net_mb_recv": 892.17,
  "top_processes": [
    {"pid": 1234, "name": "chrome.exe", "cpu_percent": 8.5},
    {"pid": 5678, "name": "python.exe", "cpu_percent": 5.2}
  ]
}
```

---

### Структура проекта

``` text
system-monitor/
├── app/
│   ├── main.py              # FastAPI приложение
│   ├── static/
│   │   ├── css/             # Стили
│   │   └── js/       			 # JS для динам. обновления
│   ├── templates/
│   │   └── index.html       # HTML-шаблон дашборда
│   └── static/              # Статические файлы (при необходимости)
├── pyproject.toml           # Зависимости Poetry
└── README.md
```

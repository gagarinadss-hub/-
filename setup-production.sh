#!/bin/bash
# ============================================================
# Random Coffee — Production Setup Script
# Запускай после деплоя на Vercel
# ============================================================

set -e

PROJECT_REF="jsenhijjgbrjlzjmcdua"
PRODUCTION_URL="https://random-coffee-lyart.vercel.app"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzZW5oaWpqZ2Jyamx6am1jZHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTU4NjUsImV4cCI6MjA5MTEzMTg2NX0.ZfUcaVQQCveqSxtzW7iJLyhH9_HTxEk6piZlr2cTq6g"

# ─────────────────────────────────────────────────────────────
# Шаг 1: Получи сервисный ключ
# Supabase Dashboard → Project Settings → API → service_role key
# ─────────────────────────────────────────────────────────────
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo ""
  echo "📋 Нужен Service Role Key из Supabase Dashboard:"
  echo "   Открой: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api"
  echo "   Скопируй 'service_role' key (секция 'Project API keys')"
  echo ""
  read -p "Вставь Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Service Role Key не указан. Выход."
  exit 1
fi

echo ""
echo "🔧 Запускаю настройку production..."
echo ""

# ─────────────────────────────────────────────────────────────
# Шаг 2: Запуск SQL-миграции (триггер уведомлений встреч)
# ─────────────────────────────────────────────────────────────
echo "📊 Запускаю migration_meeting_notifications.sql..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/supabase/migration_meeting_notifications.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Файл $SQL_FILE не найден"
  exit 1
fi

SQL_CONTENT=$(cat "$SQL_FILE")

# Используем pg-meta API Supabase для выполнения SQL
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/pg-meta/v1/query" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")}")

if echo "$RESPONSE" | grep -q '"error"'; then
  echo "⚠️  pg-meta недоступен, пробуем через Management API..."

  if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo ""
    echo "📋 Нужен Personal Access Token:"
    echo "   Открой: https://supabase.com/dashboard/account/tokens"
    echo "   Создай новый токен (или скопируй существующий)"
    echo ""
    read -p "Вставь Access Token: " SUPABASE_ACCESS_TOKEN
  fi

  if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    RESPONSE2=$(curl -s -X POST \
      "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
      -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"query\": $(echo "$SQL_CONTENT" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")}")

    if echo "$RESPONSE2" | grep -q '"error"'; then
      echo "❌ Ошибка выполнения SQL: $RESPONSE2"
      echo ""
      echo "➡️  Запусти SQL вручную:"
      echo "   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
    else
      echo "✅ SQL-миграция применена!"
    fi
  fi
else
  echo "✅ SQL-миграция применена!"
fi

# ─────────────────────────────────────────────────────────────
# Шаг 3: Добавить redirect URL в Supabase Auth
# ─────────────────────────────────────────────────────────────
echo ""
echo "🔗 Добавляю redirect URL для production..."

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo ""
  echo "📋 Нужен Personal Access Token для обновления Auth настроек:"
  echo "   Открой: https://supabase.com/dashboard/account/tokens"
  echo ""
  read -p "Вставь Access Token (Enter чтобы пропустить): " SUPABASE_ACCESS_TOKEN
fi

if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
  # Получаем текущие настройки
  CURRENT=$(curl -s \
    "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}")

  # Добавляем redirect URL к существующим
  CURRENT_REDIRECTS=$(echo "$CURRENT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
urls = d.get('uri_allow_list', '') or ''
print(urls)
" 2>/dev/null)

  NEW_REDIRECTS="${CURRENT_REDIRECTS},${PRODUCTION_URL}/auth/callback"
  NEW_REDIRECTS=$(echo "$NEW_REDIRECTS" | sed 's/^,//')

  RESP=$(curl -s -X PATCH \
    "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"uri_allow_list\": \"${NEW_REDIRECTS}\",
      \"site_url\": \"${PRODUCTION_URL}\"
    }")

  if echo "$RESP" | grep -q '"uri_allow_list"'; then
    echo "✅ Redirect URL добавлен: ${PRODUCTION_URL}/auth/callback"
    echo "✅ Site URL обновлён: ${PRODUCTION_URL}"
  else
    echo "⚠️  Не удалось обновить через API: $RESP"
    echo ""
    echo "➡️  Добавь вручную в Supabase Dashboard:"
    echo "   Открой: https://supabase.com/dashboard/project/${PROJECT_REF}/auth/url-configuration"
    echo "   Redirect URLs → добавь: ${PRODUCTION_URL}/auth/callback"
    echo "   Site URL → установи: ${PRODUCTION_URL}"
  fi
else
  echo ""
  echo "⏭️  Redirect URL пропущен. Добавь вручную:"
  echo "   https://supabase.com/dashboard/project/${PROJECT_REF}/auth/url-configuration"
  echo "   Redirect URLs: ${PRODUCTION_URL}/auth/callback"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "✅ Production setup завершён!"
echo "🌐 URL: ${PRODUCTION_URL}"
echo "═══════════════════════════════════════════"

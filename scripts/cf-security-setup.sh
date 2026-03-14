#!/bin/bash
# btcmine.info Cloudflare 安全加固一键脚本
# 用法: CF_API_TOKEN=xxx ./cf-security-setup.sh
# 需要 API Token 权限: Zone.DNS (Edit), Zone.SSL (Edit), Zone.Transform Rules (Edit)

set -euo pipefail

# === 配置 ===
ZONE_NAME="btcmine.info"
CF_API="https://api.cloudflare.com/client/v4"

if [ -z "${CF_API_TOKEN:-}" ]; then
  echo "❌ 请设置 CF_API_TOKEN 环境变量"
  echo "   获取方式: Cloudflare Dashboard → My Profile → API Tokens → Create Token"
  echo "   所需权限: Zone.DNS (Edit), Zone.SSL and Certificates (Edit), Zone.Transform Rules (Edit)"
  exit 1
fi

AUTH_HEADER="Authorization: Bearer $CF_API_TOKEN"

# 获取 Zone ID
echo "🔍 获取 Zone ID..."
ZONE_ID=$(curl -s -H "$AUTH_HEADER" "$CF_API/zones?name=$ZONE_NAME" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'][0]['id'])")
echo "   Zone ID: $ZONE_ID"

# === 1. 启用 HSTS ===
echo ""
echo "🔒 [P0] 启用 HSTS..."
curl -s -X PATCH "$CF_API/zones/$ZONE_ID/settings/security_header" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  --data '{
    "value": {
      "strict_transport_security": {
        "enabled": true,
        "max_age": 31536000,
        "include_subdomains": true,
        "preload": true,
        "nosniff": true
      }
    }
  }' | python3 -c "import sys,json; r=json.load(sys.stdin); print('   ✅ HSTS 已启用' if r.get('success') else f'   ❌ 失败: {r}')"

# === 2. 添加安全响应头 (Transform Rules) ===
echo ""
echo "🛡️  [P0] 添加安全响应头 (Transform Rules)..."

# 获取当前 ruleset ID（如果存在）
RULESET_PHASE="http_response_headers_transform"
EXISTING=$(curl -s -H "$AUTH_HEADER" "$CF_API/zones/$ZONE_ID/rulesets/phases/$RULESET_PHASE/entrypoint" 2>/dev/null)
RULESET_EXISTS=$(echo "$EXISTING" | python3 -c "import sys,json; r=json.load(sys.stdin); print('yes' if r.get('success') and r.get('result',{}).get('id') else 'no')" 2>/dev/null || echo "no")

RULES_PAYLOAD='{
  "rules": [
    {
      "expression": "true",
      "description": "Security Headers - btcmine.info",
      "action": "rewrite",
      "action_parameters": {
        "headers": {
          "X-Content-Type-Options": {
            "operation": "set",
            "value": "nosniff"
          },
          "X-Frame-Options": {
            "operation": "set",
            "value": "SAMEORIGIN"
          },
          "X-XSS-Protection": {
            "operation": "set",
            "value": "1; mode=block"
          },
          "Referrer-Policy": {
            "operation": "set",
            "value": "strict-origin-when-cross-origin"
          },
          "Permissions-Policy": {
            "operation": "set",
            "value": "geolocation=(), microphone=(), camera=()"
          }
        }
      }
    }
  ]
}'

if [ "$RULESET_EXISTS" = "yes" ]; then
  RULESET_ID=$(echo "$EXISTING" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['id'])")
  curl -s -X PUT "$CF_API/zones/$ZONE_ID/rulesets/$RULESET_ID" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    --data "$RULES_PAYLOAD" | python3 -c "import sys,json; r=json.load(sys.stdin); print('   ✅ 安全响应头已更新' if r.get('success') else f'   ❌ 失败: {r}')"
else
  curl -s -X POST "$CF_API/zones/$ZONE_ID/rulesets/phases/$RULESET_PHASE/entrypoint" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    --data "$RULES_PAYLOAD" | python3 -c "import sys,json; r=json.load(sys.stdin); print('   ✅ 安全响应头已创建' if r.get('success') else f'   ❌ 失败: {r}')"
fi

# === 3. 启用 DNSSEC ===
echo ""
echo "🔐 [P1] 启用 DNSSEC..."
DNSSEC_STATUS=$(curl -s -H "$AUTH_HEADER" "$CF_API/zones/$ZONE_ID/dnssec" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['status'])")
if [ "$DNSSEC_STATUS" = "active" ]; then
  echo "   ✅ DNSSEC 已经是 active 状态"
else
  curl -s -X POST "$CF_API/zones/$ZONE_ID/dnssec" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    --data '{"status":"active"}' | python3 -c "
import sys,json
r = json.load(sys.stdin)
if r.get('success'):
    ds = r['result'].get('ds','')
    print('   ✅ DNSSEC 已启用')
    if ds:
        print(f'   📋 DS 记录（需添加到域名注册商）:')
        print(f'   {ds}')
    print('   ⚠️  请登录域名注册商后台，添加上面的 DS 记录')
else:
    print(f'   ❌ 失败: {r}')
"
fi

# === 4. 添加 SPF 记录（防域名被冒用发垃圾邮件）===
echo ""
echo "📧 [P2] 添加 SPF TXT 记录..."
# 检查是否已存在 SPF 记录
SPF_EXISTS=$(curl -s -H "$AUTH_HEADER" "$CF_API/zones/$ZONE_ID/dns_records?type=TXT&name=$ZONE_NAME" | python3 -c "
import sys,json
records = json.load(sys.stdin)['result']
for r in records:
    if 'v=spf1' in r.get('content',''):
        print('yes')
        sys.exit()
print('no')
")

if [ "$SPF_EXISTS" = "yes" ]; then
  echo "   ✅ SPF 记录已存在"
else
  curl -s -X POST "$CF_API/zones/$ZONE_ID/dns_records" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    --data "{
      \"type\": \"TXT\",
      \"name\": \"$ZONE_NAME\",
      \"content\": \"v=spf1 -all\",
      \"ttl\": 3600
    }" | python3 -c "import sys,json; r=json.load(sys.stdin); print('   ✅ SPF 记录已添加 (v=spf1 -all)' if r.get('success') else f'   ❌ 失败: {r}')"
fi

# === 5. 添加 DMARC 记录 ===
echo ""
echo "📧 [P2] 添加 DMARC TXT 记录..."
DMARC_EXISTS=$(curl -s -H "$AUTH_HEADER" "$CF_API/zones/$ZONE_ID/dns_records?type=TXT&name=_dmarc.$ZONE_NAME" | python3 -c "
import sys,json
records = json.load(sys.stdin)['result']
print('yes' if records else 'no')
")

if [ "$DMARC_EXISTS" = "yes" ]; then
  echo "   ✅ DMARC 记录已存在"
else
  curl -s -X POST "$CF_API/zones/$ZONE_ID/dns_records" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    --data "{
      \"type\": \"TXT\",
      \"name\": \"_dmarc.$ZONE_NAME\",
      \"content\": \"v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;\",
      \"ttl\": 3600
    }" | python3 -c "import sys,json; r=json.load(sys.stdin); print('   ✅ DMARC 记录已添加 (p=reject)' if r.get('success') else f'   ❌ 失败: {r}')"
fi

# === 6. 启用 SSL Always Use HTTPS ===
echo ""
echo "🔒 [P0] 启用 Always Use HTTPS..."
curl -s -X PATCH "$CF_API/zones/$ZONE_ID/settings/always_use_https" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  --data '{"value":"on"}' | python3 -c "import sys,json; r=json.load(sys.stdin); print('   ✅ Always Use HTTPS 已启用' if r.get('success') else f'   ❌ 失败: {r}')"

# === 7. 设置 SSL 模式为 Full (Strict) ===
echo ""
echo "🔒 [P0] 设置 SSL 模式为 Full (Strict)..."
curl -s -X PATCH "$CF_API/zones/$ZONE_ID/settings/ssl" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  --data '{"value":"full"}' | python3 -c "import sys,json; r=json.load(sys.stdin); print('   ✅ SSL 模式已设置为 Full' if r.get('success') else f'   ❌ 失败: {r}')"

echo ""
echo "═══════════════════════════════════════"
echo "✅ 安全加固完成！"
echo ""
echo "已完成:"
echo "  - HSTS (max-age=1年, includeSubDomains, preload)"
echo "  - 安全响应头 (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)"
echo "  - DNSSEC (如果是新启用，需要去注册商添加 DS 记录)"
echo "  - SPF + DMARC 邮件安全记录"
echo "  - Always Use HTTPS"
echo "  - SSL Full 模式"
echo ""
echo "⚠️  注意事项:"
echo "  1. DNSSEC 的 DS 记录需要手动添加到域名注册商"
echo "  2. HSTS Preload 提交: https://hstspreload.org/"
echo "  3. 验证安全头: curl -I https://btcmine.info"
echo "═══════════════════════════════════════"

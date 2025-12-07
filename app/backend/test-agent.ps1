# Quick Test Script for AirCoach Agent

Write-Host "🧪 Testing AirCoach Backend Agent..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣  Testing health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:4000/agent/health"
    Write-Host "   ✅ Status: $($health.status)" -ForegroundColor Green
    Write-Host "   ✅ Database: $($health.database)" -ForegroundColor Green
    Write-Host "   ✅ Gemini: $($health.gemini)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Air Quality
Write-Host "2️⃣  Testing air quality endpoint (Sector 3)..." -ForegroundColor Yellow
try {
    $airQuality = Invoke-RestMethod -Uri "http://localhost:4000/agent/air-quality/3"
    Write-Host "   ✅ Location ID: $($airQuality.location_id)" -ForegroundColor Green
    Write-Host "   ✅ PM2.5: $($airQuality.pm2_5) μg/m³" -ForegroundColor Green
    Write-Host "   ✅ AQI: $($airQuality.european_aqi)" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Air quality data not available (database may be empty)" -ForegroundColor Yellow
    Write-Host "   💡 Run: python data_pipeline/air_pollution/live_air_quality.py fetch" -ForegroundColor Cyan
}

Write-Host ""

# Test 3: Chat with Agent
Write-Host "3️⃣  Testing chat endpoint..." -ForegroundColor Yellow
try {
    $body = @{
        message = "What's the air quality in Sector 3?"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:4000/agent/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    Write-Host "   ✅ Agent Response:" -ForegroundColor Green
    Write-Host "   $($response.response)" -ForegroundColor White
    Write-Host ""
    Write-Host "   📊 SQL Query: $($response.sql)" -ForegroundColor Cyan
    Write-Host "   📊 Rows: $($response.rowCount)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Chat failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✨ Testing complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Next steps:" -ForegroundColor Cyan
Write-Host "   1. If air quality data is missing, run the data pipeline" -ForegroundColor White
Write-Host "   2. Test from the mobile app (Agent tab)" -ForegroundColor White
Write-Host "   3. Try more questions in the chat" -ForegroundColor White

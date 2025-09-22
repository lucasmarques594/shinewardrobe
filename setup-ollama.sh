#!/bin/bash


set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🤖 Configurando Ollama para ShineWardrobe..."

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    error "Docker não está rodando. Inicie o Docker primeiro."
    exit 1
fi

# Iniciar Ollama
info "Iniciando Ollama..."
docker-compose -f docker-compose.ollama.yml up -d ollama

# Aguardar Ollama ficar pronto
info "Aguardando Ollama ficar pronto..."
sleep 10

# Verificar se Ollama está rodando
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null; then
        log "Ollama está rodando!"
        break
    fi
    echo -n "."
    sleep 2
    if [ $i -eq 30 ]; then
        error "Ollama não iniciou em 60 segundos"
        exit 1
    fi
done

info "Instalando modelo Llama 3.2 (3B)..."
warn "Isso pode demorar alguns minutos na primeira vez..."

docker exec shinewardrobe-ollama ollama pull llama3.2:3b

info "Verificando modelo instalado..."
if docker exec shinewardrobe-ollama ollama list | grep -q "llama3.2:3b"; then
    log "Modelo Llama 3.2:3b instalado com sucesso!"
else
    error "Falha ao instalar modelo"
    exit 1
fi

info "Testando modelo..."
test_response=$(docker exec shinewardrobe-ollama ollama run llama3.2:3b "Responda apenas: OK" 2>/dev/null || echo "ERRO")

if [[ "$test_response" == *"OK"* ]]; then
    log "Modelo funcionando corretamente!"
else
    warn "Modelo instalado mas pode precisar de aquecimento"
fi

info "Iniciando backend com Ollama..."
docker-compose -f docker-compose.ollama.yml up -d

info "Aguardando backend ficar pronto..."
sleep 15

if curl -s http://localhost:8080/health > /dev/null; then
    log "Backend funcionando!"
else
    error "Backend não está respondendo"
    echo "Verificar logs: docker-compose -f docker-compose.ollama.yml logs backend"
    exit 1
fi

echo ""
log "🎉 Ollama configurado com sucesso!"
echo ""
info "📍 Serviços disponíveis:"
echo "   🤖 Ollama: http://localhost:11434"
echo "   🔗 Backend: http://localhost:8080"
echo "   📚 Swagger: http://localhost:8080/swagger"
echo ""
info "🧪 Teste rápido da IA:"
echo '   curl -X POST http://localhost:11434/api/generate \\'
echo '     -H "Content-Type: application/json" \\'
echo '     -d {"model":"llama3.2:3b","prompt":"Olá, como está?"}'
echo ""
info "🛑 Para parar tudo:"
echo "   docker-compose -f docker-compose.ollama.yml down"
echo ""
warn "💡 Dicas:"
echo "   - Primeira execução da IA pode ser mais lenta"
echo "   - Modelo ocupa ~2GB de espaço em disco"
echo "   - Para modelo maior: ollama pull llama3.2:7b"
echo ""
log "Ollama está pronto para gerar recomendações! 🚀"
import axios from 'axios';

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  isLuxury: boolean;
  isEconomic: boolean;
  imageUrl?: string;
  productUrl: string;
}

export interface OutfitRecommendation {
  economic: Array<{
    productId: string;
    category: string;
    name: string;
    price: number;
    imageUrl?: string;
    productUrl: string;
  }>;
  luxury: Array<{
    productId: string;
    category: string;
    name: string;
    price: number;
    imageUrl?: string;
    productUrl: string;
  }>;
}

export class OllamaService {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2:3b'; // Modelo leve
  }

  async generateOutfitRecommendation(
    weather: WeatherData,
    city: string,
    gender: 'male' | 'female' | 'other',
    availableProducts: Product[]
  ): Promise<{ outfit: OutfitRecommendation; reasoning: string }> {
    const economicProducts = availableProducts.filter(p => p.isEconomic);
    const luxuryProducts = availableProducts.filter(p => p.isLuxury);

    const prompt = `Você é um consultor de moda especializado. Com base no clima atual, recomende roupas adequadas.

CLIMA ATUAL EM ${city.toUpperCase()}:
- Temperatura: ${weather.temperature}°C
- Condição: ${weather.condition}
- Descrição: ${weather.description}
- Umidade: ${weather.humidity}%
- Vento: ${weather.windSpeed} km/h

PERFIL DO USUÁRIO:
- Gênero: ${gender}

PRODUTOS ECONÔMICOS DISPONÍVEIS:
${economicProducts.slice(0, 10).map(p => `- ${p.category}: ${p.name} - R$ ${p.price} (ID: ${p.id})`).join('\n')}

PRODUTOS LUXUOSOS DISPONÍVEIS:
${luxuryProducts.slice(0, 10).map(p => `- ${p.category}: ${p.name} - R$ ${p.price} (ID: ${p.id})`).join('\n')}

TAREFA: Recomende 2 peças ECONÔMICAS e 2 peças LUXUOSAS adequadas ao clima.

Responda APENAS em formato JSON válido:
{
  "economic": [
    {"productId": "id1", "category": "categoria", "name": "nome", "price": preço, "reasoning": "motivo"},
    {"productId": "id2", "category": "categoria", "name": "nome", "price": preço, "reasoning": "motivo"}
  ],
  "luxury": [
    {"productId": "id1", "category": "categoria", "name": "nome", "price": preço, "reasoning": "motivo"},
    {"productId": "id2", "category": "categoria", "name": "nome", "price": preço, "reasoning": "motivo"}
  ],
  "general_reasoning": "explicação geral considerando o clima"
}`;

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1000
        }
      }, {
        timeout: 30000 // 30 segundos
      });

      const aiResponse = response.data.response;
      
      // Extrair JSON da resposta
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      // Mapear produtos com URLs
      const outfit: OutfitRecommendation = {
        economic: result.economic.map((item: any) => {
          const product = economicProducts.find(p => p.id === item.productId);
          return {
            productId: item.productId,
            category: item.category,
            name: item.name,
            price: item.price,
            imageUrl: product?.imageUrl,
            productUrl: product?.productUrl || '#'
          };
        }),
        luxury: result.luxury.map((item: any) => {
          const product = luxuryProducts.find(p => p.id === item.productId);
          return {
            productId: item.productId,
            category: item.category,
            name: item.name,
            price: item.price,
            imageUrl: product?.imageUrl,
            productUrl: product?.productUrl || '#'
          };
        })
      };

      return {
        outfit,
        reasoning: result.general_reasoning || 'Recomendação baseada no clima atual'
      };

    } catch (error) {
      console.error('Ollama API error:', error);
      
      // Fallback para algoritmo simples
      return this.getFallbackRecommendation(economicProducts, luxuryProducts, weather);
    }
  }

  // Método para verificar se Ollama está disponível
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Método para instalar modelo se necessário
  async ensureModel(): Promise<void> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      const models = response.data.models || [];
      
      const hasModel = models.some((model: any) => model.name.includes(this.model.split(':')[0]));
      
      if (!hasModel) {
        console.log(`Installing Ollama model: ${this.model}`);
        await axios.post(`${this.baseUrl}/api/pull`, {
          name: this.model
        });
      }
    } catch (error) {
      console.error('Failed to ensure Ollama model:', error);
    }
  }

  private getFallbackRecommendation(
    economicProducts: Product[],
    luxuryProducts: Product[],
    weather: WeatherData
  ): { outfit: OutfitRecommendation; reasoning: string } {
    // Algoritmo simples baseado na temperatura
    const isHot = weather.temperature > 25;
    const isCold = weather.temperature < 15;
    const isRainy = weather.condition.toLowerCase().includes('rain');

    // Selecionar produtos baseado na temperatura
    let selectedEconomic = economicProducts.slice(0, 2);
    let selectedLuxury = luxuryProducts.slice(0, 2);

    // Filtrar por categoria se possível
    if (isHot) {
      selectedEconomic = economicProducts.filter(p => 
        p.category === 'shirt' || p.category === 'shorts'
      ).slice(0, 2);
      selectedLuxury = luxuryProducts.filter(p => 
        p.category === 'shirt' || p.category === 'shorts'
      ).slice(0, 2);
    } else if (isCold) {
      selectedEconomic = economicProducts.filter(p => 
        p.category === 'jacket' || p.category === 'pants'
      ).slice(0, 2);
      selectedLuxury = luxuryProducts.filter(p => 
        p.category === 'jacket' || p.category === 'pants'
      ).slice(0, 2);
    }

    // Fallback se não tiver produtos específicos
    if (selectedEconomic.length === 0) selectedEconomic = economicProducts.slice(0, 2);
    if (selectedLuxury.length === 0) selectedLuxury = luxuryProducts.slice(0, 2);

    const economicSelection = selectedEconomic.map(p => ({
      productId: p.id,
      category: p.category,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl,
      productUrl: p.productUrl
    }));

    const luxurySelection = selectedLuxury.map(p => ({
      productId: p.id,
      category: p.category,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl,
      productUrl: p.productUrl
    }));

    let reasoning = 'Recomendação baseada nas condições climáticas: ';
    if (isHot) reasoning += 'tempo quente, roupas leves e respiráveis';
    else if (isCold) reasoning += 'tempo frio, roupas quentes e confortáveis';
    else reasoning += 'temperatura amena, roupas versáteis';
    
    if (isRainy) reasoning += ' com proteção contra chuva';

    return {
      outfit: {
        economic: economicSelection,
        luxury: luxurySelection
      },
      reasoning
    };
  }
}
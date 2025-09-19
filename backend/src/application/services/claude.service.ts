import Anthropic from '@anthropic-ai/sdk';

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

export class ClaudeService {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY environment variable is required');
    }
    
    this.anthropic = new Anthropic({
      apiKey,
    });
  }

  async generateOutfitRecommendation(
    weather: WeatherData,
    city: string,
    gender: 'male' | 'female' | 'other',
    availableProducts: Product[]
  ): Promise<{ outfit: OutfitRecommendation; reasoning: string }> {
    const economicProducts = availableProducts.filter(p => p.isEconomic);
    const luxuryProducts = availableProducts.filter(p => p.isLuxury);

    const prompt = `
Você é um consultor de moda especializado. Com base nas informações fornecidas, recomende um outfit completo.

DADOS DO CLIMA:
- Cidade: ${city}
- Temperatura: ${weather.temperature}°C
- Condição: ${weather.condition}
- Descrição: ${weather.description}
- Umidade: ${weather.humidity}%
- Vento: ${weather.windSpeed} km/h

PERFIL DO USUÁRIO:
- Gênero: ${gender}

PRODUTOS DISPONÍVEIS ECONÔMICOS:
${economicProducts.map(p => `- ${p.category}: ${p.name} - R$ ${p.price} (ID: ${p.id})`).join('\n')}

PRODUTOS DISPONÍVEIS LUXO:
${luxuryProducts.map(p => `- ${p.category}: ${p.name} - R$ ${p.price} (ID: ${p.id})`).join('\n')}

TAREFA:
1. Analise o clima e sugira 2 opções ECONÔMICAS e 2 opções LUXUOSAS
2. Considere a adequação ao clima, conforto e estilo
3. Retorne APENAS um JSON válido no formato:

{
  "economic": [
    {
      "productId": "id_do_produto",
      "category": "categoria",
      "name": "nome_do_produto",
      "price": preço_numérico,
      "reasoning": "motivo_da_escolha"
    }
  ],
  "luxury": [
    {
      "productId": "id_do_produto", 
      "category": "categoria",
      "name": "nome_do_produto",
      "price": preço_numérico,
      "reasoning": "motivo_da_escolha"
    }
  ],
  "general_reasoning": "explicação_geral_da_escolha_baseada_no_clima_e_situação"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Claude response');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      // Map products and add URLs
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
      console.error('Claude API error:', error);
      
      // Fallback recommendation
      return this.getFallbackRecommendation(economicProducts, luxuryProducts, weather);
    }
  }

  private getFallbackRecommendation(
    economicProducts: Product[],
    luxuryProducts: Product[],
    weather: WeatherData
  ): { outfit: OutfitRecommendation; reasoning: string } {
    // Simple fallback logic
    const isHot = weather.temperature > 25;
    const isCold = weather.temperature < 15;
    const isRainy = weather.condition.toLowerCase().includes('rain');

    const economicSelection = economicProducts
      .slice(0, 2)
      .map(p => ({
        productId: p.id,
        category: p.category,
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl,
        productUrl: p.productUrl
      }));

    const luxurySelection = luxuryProducts
      .slice(0, 2)
      .map(p => ({
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
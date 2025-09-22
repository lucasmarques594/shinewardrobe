'use client'

import { useState } from 'react'
import axios from 'axios'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState('')
  const [recommendations, setRecommendations] = useState(null)
  const [token, setToken] = useState('')

  const API_URL = 'http://localhost:8080/api'

  const handleAuth = async () => {
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register'
      const data = isLogin ? { email, password } : { email, password, name }
      
      const response = await axios.post(`${API_URL}${endpoint}`, data)
      
      if (response.data.success) {
        setToken(response.data.data.token)
        setMessage(`✅ ${isLogin ? 'Login' : 'Cadastro'} realizado com sucesso!`)
      }
    } catch (error: any) {
      setMessage(`❌ Erro: ${error.response?.data?.message || error.message}`)
    }
  }

  const getRecommendations = async () => {
    try {
      const response = await axios.post(`${API_URL}/recommendations`, {
        city: 'São Paulo',
        gender: 'other'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setRecommendations(response.data.data)
        setMessage('✅ Recomendações geradas!')
      }
    } catch (error: any) {
      setMessage(`❌ Erro: ${error.response?.data?.message || error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          🌟 ShineWardrobe
        </h1>
        
        {!token ? (
          <div className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {!isLogin && (
              <div>
                <input
                  type="text"
                  placeholder="Nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            
            <button
              onClick={handleAuth}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isLogin ? '🔑 Entrar' : '📝 Cadastrar'}
            </button>
            
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-blue-600 hover:text-blue-800 transition-colors"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-green-600 font-semibold">✅ Logado com sucesso!</p>
            
            <button
              onClick={getRecommendations}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              🤖 Gerar Recomendações IA
            </button>
            
            <button
              onClick={() => {
                setToken('')
                setRecommendations(null)
                setMessage('')
              }}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              🚪 Sair
            </button>
          </div>
        )}
        
        {message && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <p className="text-sm">{message}</p>
          </div>
        )}
        
        {recommendations && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold mb-2">🛍️ Recomendações:</h3>
            <div className="text-sm space-y-2">
              <div>
                <strong>💰 Econômico:</strong>
                {(recommendations as any)?.outfit?.economic?.map((item: any, i: number) => (
                  <div key={i} className="ml-2">• {item.name} - R$ {item.price}</div>
                ))}
              </div>
              <div>
                <strong>✨ Luxo:</strong>
                {(recommendations as any)?.outfit?.luxury?.map((item: any, i: number) => (
                  <div key={i} className="ml-2">• {item.name} - R$ {item.price}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
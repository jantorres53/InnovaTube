import axios from 'axios';

const API_URL = 'http://localhost:5000';

async function testAPI() {
  console.log('🧪 Probando API de InnovaTube...\n');

  try {
    // Test 1: Verificar que el servidor esté funcionando
    console.log('1. Verificando conexión con el servidor...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('✅ Servidor funcionando:', healthResponse.data);

    // Test 2: Verificar endpoints de autenticación
    console.log('\n2. Probando endpoints de autenticación...');
    
    // Test registro
    try {
      const registerData = {
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser' + Date.now(),
        email: 'test' + Date.now() + '@example.com',
        password: 'password123',
        recaptchaToken: 'test-token'
      };
      
      const registerResponse = await axios.post(`${API_URL}/api/auth/register`, registerData);
      console.log('✅ Registro exitoso');
    } catch (error: any) {
      console.log('❌ Error en registro:', error.response?.data?.message || error.message);
    }

    // Test login
    try {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, loginData);
      console.log('✅ Login exitoso');
    } catch (error: any) {
      console.log('❌ Error en login:', error.response?.data?.message || error.message);
    }

    // Test 3: Verificar búsqueda de videos
    console.log('\n3. Probando búsqueda de videos de YouTube...');
    try {
      const searchResponse = await axios.get(`${API_URL}/api/videos/search?query=javascript programming`);
      console.log('✅ Búsqueda de videos exitosa');
      console.log(`📺 Encontrados ${searchResponse.data.data.videos.length} videos`);
    } catch (error: any) {
      console.log('❌ Error en búsqueda de videos:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 ¡Pruebas completadas!');
    
  } catch (error: any) {
    console.error('❌ Error durante las pruebas:', error.message);
  }
}

// Ejecutar pruebas
testAPI();
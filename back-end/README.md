# InnovaTube Backend

## Configuración de MongoDB Atlas

1. **Crear cuenta en MongoDB Atlas**
   - Ve a [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Regístrate o inicia sesión

2. **Crear un nuevo cluster**
   - Crea un nuevo proyecto
   - Crea un cluster gratuito (M0)
   - Selecciona el proveedor de nube (AWS, Google Cloud, Azure)
   - Selecciona la región más cercana

3. **Configurar el acceso a la base de datos**
   - Ve a "Database Access" → "Add New Database User"
   - Crea un usuario con contraseña segura
   - Guarda estas credenciales

4. **Configurar el acceso a la red**
   - Ve a "Network Access" → "Add IP Address"
   - Para desarrollo: "Allow Access from Anywhere" (0.0.0.0/0)
   - Para producción: agrega tu IP específica

5. **Obtener la URI de conexión**
   - Ve a "Database" → "Connect" → "Connect your application"
   - Selecciona "Node.js" y copia la URI
   - La URI tendrá este formato:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
     ```

6. **Configurar las variables de entorno**
   - Actualiza el archivo `.env` con:
     ```
     MONGODB_URI=mongodb+srv://tu_usuario:tu_contraseña@cluster0.xxxxx.mongodb.net/innovatube?retryWrites=true&w=majority
     ```

## Configuración de otras APIs

### YouTube Data API v3
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la "YouTube Data API v3"
4. Crea credenciales (API Key)
5. Actualiza el `.env` con:
   ```
   YOUTUBE_API_KEY=tu_api_key_aqui
   ```

### reCAPTCHA
1. Ve a [Google reCAPTCHA](https://www.google.com/recaptcha/admin)
2. Crea un nuevo sitio (reCAPTCHA v2)
3. Obtén las claves del sitio y secreta
4. Actualiza el `.env` con:
   ```
   RECAPTCHA_SECRET_KEY=tu_secret_key_aqui
   ```

## Instalación y ejecución

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build

# Ejecutar en producción
npm start
```

## Endpoints de la API

### Autenticación
- `POST /api/auth/register` - Registro de usuarios
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/logout` - Cierre de sesión
- `GET /api/auth/me` - Obtener perfil del usuario

### Videos
- `GET /api/videos/search?query=termino` - Buscar videos en YouTube
- `GET /api/videos/favorites` - Obtener videos favoritos del usuario
- `POST /api/videos/favorites` - Agregar video a favoritos
- `DELETE /api/videos/favorites/:videoId` - Eliminar video de favoritos

## Estructura del proyecto

```
src/
├── config/          # Configuración (base de datos, etc.)
├── controllers/     # Controladores de la API
├── middleware/      # Middleware (autenticación, etc.)
├── models/          # Modelos de MongoDB
├── routes/          # Rutas de la API
├── services/        # Servicios (auth, youtube, etc.)
└── index.ts         # Punto de entrada del servidor
```

## Variables de entorno requeridas

```
PORT=5000
NODE_ENV=development
MONGODB_URI=tu_uri_de_mongodb_atlas
JWT_SECRET=tu_secreto_jwt_super_seguro
JWT_EXPIRE=7d
YOUTUBE_API_KEY=tu_api_key_de_youtube
RECAPTCHA_SECRET_KEY=tu_secret_key_de_recaptcha
FRONTEND_URL=http://localhost:3000
```
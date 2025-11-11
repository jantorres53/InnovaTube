# InnovaTube

Proyecto full-stack para búsqueda y favoritos de videos, con autenticación y registro, construido con Node.js/Express (backend) y React + Vite + Tailwind (frontend).

## Resumen y avances

- Autenticación:
  - Login con campo unificado `login` (usuario o email) + `password`.
  - Registro con validación de contraseña y reCAPTCHA.
  - Auto-login después de registro exitoso (token + usuario guardados).
  - Overlay de carga (`Loader`) en login/registro y overlay de "Cerrando sesión" en logout.
- UI Front-end:
  - Página de Login y Register con estilos.
  - Medidor de fuerza de contraseña (muy débil → muy fuerte) y checklist de requisitos.
  - Dashboard protegido: búsquedas de videos, listado de favoritos, botón de Cerrar Sesión.
- API y servicios:
  - Interceptor de auth en Axios, manejo global de 401.
  - Búsqueda de videos y gestión de favoritos (estructura preparada).
- Backend:
  - Controlador de auth ajustado para `login` (email o username).
  - Middleware JWT y configuración de CORS.
  - Integración reCAPTCHA y soporte para YouTube API.

## Estructura

```
InnovaTube/
├── Front-end/              # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── contexts/
│   │   └── services/
│   └── .env                # variables frontend
├── back-end/               # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── config/
│   └── .env                # variables backend
└── README.md
```

## Requisitos

- Node.js `>=18` (instalado tienes `node@22.17.1`).
- MongoDB accesible (local o remoto).
- Claves de API (YouTube, reCAPTCHA) si usas esas integraciones.

## Instalación y ejecución

1) Clonar y entrar al proyecto
```
# Ya en la carpeta InnovaTube
```

2) Configurar variables de entorno
- Front-end: crear `Front-end/.env`
- Back-end: crear `back-end/.env`

3) Instalar dependencias
```
cd Front-end
npm install
cd ../back-end
npm install
```

4) Levantar backend y frontend
```
# Backend (puerto por defecto 5000)
cd back-end
npm run dev

# Frontend (puerto Vite por defecto 5173)
cd ../Front-end
npm run dev
```

5) Abrir en navegador
- Frontend: `http://localhost:5173/login` o `http://localhost:5173/register`
- Dashboard (requiere login): `http://localhost:5173/dashboard`

## Variables de entorno (.env)

### Front-end (`Front-end/.env`)

```
# URL del backend (incluye protocolo y puerto)
VITE_API_URL=http://localhost:5000

# Clave de sitio de reCAPTCHA (visible en frontend)
VITE_RECAPTCHA_SITE_KEY=tu_site_key_recaptcha
```

Notas:
- `VITE_API_URL` se usa en `src/services/api.ts`.
- `VITE_RECAPTCHA_SITE_KEY` se usa en `src/pages/Register.tsx`.

### Back-end (`back-end/.env`)

```
# Puerto del servidor Express
PORT=5000

# Entorno
NODE_ENV=development

# URL permitida para CORS del frontend
FRONTEND_URL=http://localhost:5173

# Conexión a MongoDB
MONGODB_URI=mongodb://localhost:27017/innovatube

# Secret para firmar JWT
JWT_SECRET=una_clave_segura_muy_secreta

# Clave del API de YouTube (opcional si usas búsqueda real)
YOUTUBE_API_KEY=tu_api_key_youtube

# Clave secreta de reCAPTCHA (se valida en backend)
RECAPTCHA_SECRET_KEY=tu_secret_key_recaptcha

# SMTP para envío de correos (recuperación de contraseña)
SMTP_USERNAME=puntodeventaratapro@gmail.com
SMTP_PASSWORD=tu_app_password_gmail_sin_espacios
```

Notas:
- `JWT_SECRET` se usa en `middleware/auth.ts` y `services/authService.ts`.
- `MONGODB_URI` se usa en `src/config/database.ts`.
- `RECAPTCHA_SECRET_KEY` se usa en `src/controllers/authController.ts`.
- `YOUTUBE_API_KEY` se usa en `src/services/youtubeService.ts`.
- `SMTP_USERNAME` y `SMTP_PASSWORD` se usan en `src/services/mailService.ts`.

Importante:
- Para Gmail, usa una Contraseña de Aplicación (no tu contraseña normal). Suele mostrarse con espacios, pero debe colocarse sin espacios en `.env`.
- Ejemplo: si tu contraseña se ve `ffwj xaui khdq lozc`, escribe `ffwjxauikhdqlozc`.

## Comandos útiles

### Front-end
- `npm run dev`: arranca Vite en desarrollo.
- `npm run build`: build de producción.
- `npm run preview`: previsualiza el build.

### Back-end
- `npm run dev`: arranca el servidor con ts-node-dev/nodemon.
- `npm run build`: compila TypeScript a `dist/`.
- `npm start`: arranca desde `dist/` en producción.

## Características implementadas

- Login con usuario/email + contraseña.
- Registro con validación de contraseña y reCAPTCHA.
- Auto-login tras registro y redirección al dashboard.
- Overlay de carga en login/registro y animación de logout.
- Interceptores Axios para token y manejo de 401.
- Búsqueda y favoritos (estructura de servicios y UI base).
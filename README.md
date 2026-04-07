# NEXO ERP

Sistema integral de Planificación de Recursos Empresariales (ERP) diseñado para una MYPE peruana.

## Stack Tecnológico 💻
- **Frontend**: React 18, Vite, React Router DOM, Axios, Vanilla CSS (DM Sans, DM Mono)
- **Backend**: Node.js 20, Express, PostgreSQL (pg), JWT, bcryptjs
- **Base de Datos**: PostgreSQL 16
- **Infraestructura**: Docker y Docker Compose (listo para Dokploy)

## Estructura del Proyecto 📁
El proyecto está dividido en dos partes principales:
- `/backend`: API REST, autenticación JWT, conexión a DB y migraciones
- `/frontend`: SPA en React con ruteo y componentes UI

## Instrucciones de Despliegue en Dokploy 🚀

### 1. Preparación del Servidor
1. Instala Dokploy en un servidor VPS Ubuntu (recomendado 2GB+ RAM).
2. Clona este repositorio o asegúrate de tener los archivos listos en el servidor.

### 2. Creación del Servicio
1. En Dokploy, ve a tu proyecto y haz clic en **Create Service** > **Compose**.
2. Dale un nombre (ej. `nexo-erp`).
3. En el campo de código de docker-compose, puedes elegir "Github", "GitLab" o "Raw" y proveer el código de `/docker-compose.yml`.
4. El archivo `docker-compose.yml` desplegará tres contenedores en orquestación: `postgres`, `backend` y `frontend`.

### 3. Variables de Entorno (Environment Variables)
Agrega las variables necesarias en la pestaña "Environment" de Dokploy, o usa el archivo `.env.example` proporcionado como base:

```env
POSTGRES_USER=nexo
POSTGRES_PASSWORD=una_contraseña_segura
POSTGRES_DB=nexo_erp

JWT_SECRET=tu_secreto_super_seguro
JWT_REFRESH_SECRET=tu_secreto_para_el_refresh

NODE_ENV=production
```

### 4. Despliegue
1. Haz clic en **Deploy**.
2. Dokploy construirá las imágenes utilizando los `Dockerfile` de cada carpeta.
3. El frontend está configurado como *multi-stage* (reducirá la imagen usando Nginx minimizado).
4. El backend detectará si la base de datos está vacía mediante un sistema de auto-seed incorporado en `src/index.js`, inicializando los esquemas (enums, tablas) y creando datos de prueba.

### 5. Exposición (Dominios)
1. Ve a la pestaña **Domains / Traefik** de Dokploy en el servicio *Compose*.
2. Apunta el servicio y puerto (en nuestro caso, queremos exponer `nexo-frontend` / `nexo-frontend:80` ya que Nginx sirve tanto el UI como el reverse-proxy para `/api/`).
3. ¡Listo! Accede a tu dominio asignado.

---

## 🔑 Credenciales por Defecto (Auto-generadas en el Seed)
- **Usuario:** `admin@nexo.pe`
- **Contraseña:** `Admin1234!`
- **Rol:** `SUPER_ADMIN`

Se generarán también usuarios para cada área (`admin.<area>@nexo.pe`), un `auditor@nexo.pe`, y registros completos (ventas, stock, tickets) para pruebas.

## Reglas de Roles y Permisos (RBAC) 🛡️
- **SUPER_ADMIN**: Acceso y escritura en todas las áreas.
- **ADMIN_AREA**: Acceso y escritura/eliminación **solo en su área**.
- **SUPERVISOR**: Lectura total, aprobaciones solo en su área.
- **OPERARIO**: Ingreso/edición de registros en su área.
- **AUDITOR**: Solo lectura y reporte de CSV. Interfaz "Read-Only".

## Autor
Autogenerado por Antigravity.

# 🚒 Sistema de Asistencia · CGBVP Compañía de Bomberos Ancón N.° 163

Plataforma web institucional para el control y gestión de asistencia de la
**Sección de Instrucción** del Cuerpo General de Bomberos Voluntarios del Perú,
Compañía Ancón N.° 163.

**Mobile-first · PWA · Dos áreas: Portal del Usuario + Panel Administrativo**

---

## ✨ Funcionalidades incluidas

### Portal del usuario
- Inicio de sesión con usuario y contraseña (sin registro público).
- Panel personal: asistencias, tardanzas, faltas justificadas/pendientes/rechazadas.
- **Registro de asistencia con evidencia fotográfica en tiempo real** (cámara del
  dispositivo; si el navegador bloquea la cámara web, abre la cámara nativa).
- Datos automáticos: nombre, categoría, grado, fecha y hora (sin teclear nada).
- **Un solo registro por jornada** (el sistema lo bloquea automáticamente).
- **Registro de faltas** con motivo y carga de evidencias (fotos, PDF, capturas).
- **Mi historial**: calendario mensual con colores (🟢 asistencia, 🟠 tardanza,
  🟡 justificada, 🔴 injustificada) y detalle por día.
- **Mis guardias** (solo aspirantes): el aspirante **elige y registra su propio día
  de guardia**, y consulta próximas, cumplidas, justificadas y no cumplidas.
- **Documentos institucionales**: visualizar y descargar.
- Cambio de contraseña.

### Panel administrativo
- **Dashboard**: resumen del día (esperados, presentes, tardíos, justificadas,
  injustificadas), resumen semanal con % de asistencia, cumplimiento de guardias,
  top faltas y top tardanzas.
- **Calendario interactivo** con vistas **día / semana / mes** y listas separadas:
  asistieron, llegaron tarde, faltaron justificadamente, faltaron injustificadamente.
  Acceso directo a la 📷 evidencia fotográfica de cada asistencia.
- **Gestión de usuarios**: crear, editar, activar/desactivar (el historial se
  conserva), restablecer contraseña. Categorías: postulante / aspirante / administrador.
- **Revisión de justificaciones**: aprobar / rechazar con observación administrativa.
- **Control de guardias nocturnas**: los aspirantes eligen y registran su propio
  día de guardia desde su portal; el administrador verifica y marca
  cumplida / justificada / no cumplida.
- **Rankings**: más faltas (total, justificadas, injustificadas) y más tardanzas.
- **Documentos**: subir y eliminar documentación institucional.
- **Auditoría**: trazabilidad de creación de usuarios, asistencias, aprobaciones, etc.
- **Configuración**: hora límite de puntualidad (por defecto 20:00 h; desde esa
  hora todo registro es tardanza).

### Seguridad anti-suplantación
- 📷 Foto tomada en el momento desde la cámara (no desde galería cuando es posible).
- ⏱ Hora oficial del servidor (Firebase `serverTimestamp`), no la del teléfono.
- 1️⃣ Un registro por usuario por jornada.
- 🔐 Roles y permisos en Firebase (reglas incluidas en `firestore.rules` y `storage.rules`).
- 🧾 Auditoría de acciones.

---

## 🚀 Puesta en marcha (2 opciones)

### OPCIÓN A — Modo Demo (funciona YA, sin configurar nada)
1. Abre `index.html` en cualquier navegador (o sirve la carpeta con cualquier
   servidor estático).
2. Credenciales de prueba:
   | Usuario | Contraseña | Rol |
   |---|---|---|
   | `admin` | `admin123` | Administrador |
   | `juan.perez` | `demo123` | Aspirante (con guardias) |
   | `maria.garcia` | `demo123` | Postulante |
3. Los datos se guardan en el navegador (localStorage). Ideal para probar y capacitar.

### OPCIÓN B — Firebase (producción) — necesito que hagas esto:
1. Crea una cuenta/proyecto en **https://console.firebase.google.com** (puedes usar
   tu Gmail actual; no hace falta crear una nueva).
2. En el proyecto:
   - **Build → Authentication → Sign-in method →** activa **Correo electrónico/Contraseña**.
   - **Build → Firestore Database → Crear base de datos** (modo bloqueado).
   - **Build → Storage → Comenzar** (modo bloqueado).
3. Ve a ⚙️ **Configuración del proyecto → Mis aplicaciones → Agregar aplicación Web (</>)**,
   copia el objeto `firebaseConfig` y **pégalo en `assets/js/firebase-config.js`**
   (reemplazando los valores `PEGA_TU_...`).
4. En **Firestore Database → Reglas**: pega el contenido de `firestore.rules` → Publicar.
5. En **Storage → Reglas**: pega el contenido de `storage.rules` → Publicar.
6. **Crear el primer administrador**: la primera cuenta debe crearse desde la consola de
   Firebase (Authentication → Add user: correo `admin@cgbvp163.pe`, contraseña de tu
   elección) y luego en Firestore crear el documento `users/{uid}` con:
   ```json
   { "nombres": "Tu nombre", "apellidos": "Apellidos", "username": "admin",
     "categoria": "administrador", "grado": "Oficial", "activo": true }
   ```
   Con eso entras al panel y **desde el sistema** creas a todos los demás usuarios
   (postulantes y aspirantes) — el sistema crea su cuenta de autenticación automáticamente.

> 🔑 **Nota sobre usuarios/contraseñas**: Firebase Auth exige correos, así que el
> sistema convierte cada `usuario` internamente en `usuario@cgbvp163.pe`. Los
> integrantes solo ven y usan su nombre de usuario normal.

---

## 📤 Publicación en GitHub Pages (gratis)

1. Crea un repositorio en GitHub y sube **todo el contenido de esta carpeta**.
2. En el repo: **Settings → Pages → Source: Deploy from a branch →** rama `main`,
   carpeta `/ (root)` → Save.
3. En 1–2 minutos estará en `https://TU-USUARIO.github.io/TU-REPO/`.
4. Los usuarios pueden **"Agregar a pantalla de inicio"** desde el móvil y queda
   instalada como app (PWA).

> ⚠️ **Importante**: la cámara (getUserMedia) solo funciona en **HTTPS** o
> `localhost`. GitHub Pages sí es HTTPS, por lo que la evidencia fotográfica
> funcionará perfectamente. Además, si el navegador bloquea la cámara, la app
> ofrece automáticamente abrir la **cámara nativa del teléfono**.

---

## 🗂️ Estructura del proyecto

```
bomberos-ancon163/
├── index.html                  → Aplicación completa (login + portal + admin)
├── manifest.json               → Instalación PWA
├── sw.js                       → Service Worker (funciona offline)
├── assets/
│   ├── css/styles.css          → Estilos mobile-first
│   └── js/
│       ├── firebase-config.js  → 👈 PEGA AQUÍ tu configuración de Firebase
│       └── app.js              → Toda la lógica del sistema
├── firestore.rules             → Reglas de seguridad de la base de datos
├── storage.rules               → Reglas de seguridad de archivos
└── README.md
```

## 🧩 Base de datos (colecciones)
| Colección | Contenido |
|---|---|
| `users` | Perfiles: nombres, usuario, categoría, grado, activo |
| `attendance` | Asistencias/tardanzas con fecha, hora y foto de evidencia |
| `absences` | Faltas con motivo, archivos y estado (pendiente/aprobada/rechazada) |
| `guards` | Guardias nocturnas de aspirantes y su cumplimiento |
| `documents` | Documentación institucional |
| `audit` | Registro de auditoría |
| `config` | Configuración general (hora límite de puntualidad) |

## 🛣️ Mejoras futuras ya previstas por la arquitectura
- Código QR / PIN dinámico por jornada (validación de presencia física).
- Geolocalización opcional con consentimiento del usuario.
- Sincronización de reportes a Google Sheets (vía Apps Script) para oficina.
- Notificaciones push de guardias próximas.

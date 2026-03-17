
# SmartPig Lite - Gestión Porcina Profesional

Aplicación robusta para la gestión de granjas porcinas, optimizada para móviles y con sincronización en la nube (Firebase).

## 🚀 Guía de Actualización y Despliegue (Último Paso)

Sigue estos pasos exactos en la **Terminal** para que tu App se publique sin errores:

### Paso 1: Enviar el código corregido a GitHub
Copia y pega estos comandos uno por uno (o todos juntos si tu terminal lo permite):

```bash
# 1. Preparar los archivos corregidos
git add .

# 2. Crear el registro del cambio (commit)
git commit -m "Fix: Corrección de errores de compilación y limpieza final"

# 3. Enviar a GitHub
git push origin main
```

### Paso 2: Verificar el Hosting
1. Ve a la [Consola de Firebase](https://console.firebase.google.com/).
2. Entra en **App Hosting**.
3. Verás que se ha iniciado automáticamente una nueva "Implementación" (Build).
4. Espera unos minutos hasta que diga **"Correcto"**. ¡Tu App ya estará funcionando en el enlace público!

---

### 🔑 Recordatorio de Contraseña (GitHub)
Cuando ejecutes `git push`, GitHub te pedirá tu usuario y contraseña. Usa tu **Personal Access Token (PAT)** como contraseña. Si no tienes uno:
1. GitHub -> Settings -> Developer Settings -> Personal access tokens (classic).
2. Genera uno con permisos de `repo`.

---

## ✨ Características de esta versión
- **Sin IA**: Aplicación ligera y rápida sin dependencias innecesarias.
- **Sincronización Total**: Todos los datos se guardan en Firebase Firestore.
- **PWA**: Instalable en Android e iOS como una App nativa.

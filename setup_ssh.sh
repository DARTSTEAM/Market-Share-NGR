#!/bin/bash

# ==============================================================================
# Script de Configuración SSH IAP para ABN Digital
# ==============================================================================

set -e

# Colores para la salida
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando validación y configuración de entorno para ABN Digital...${NC}\n"

# 1. Verificar si gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}[ERROR] Google Cloud SDK (gcloud) no está instalado o no está en el PATH.${NC}"
    echo "Por favor instálalo desde: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# 2. Verificar cuenta activa
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format='value(account)')
REQUIRED_ACCOUNT="darts@abndigital.com.ar"

if [ "$ACTIVE_ACCOUNT" != "$REQUIRED_ACCOUNT" ]; then
    echo -e "${YELLOW}[AVISO] No estás logueado con la cuenta requerida ($REQUIRED_ACCOUNT).${NC}"
    echo "Ejecutando inicio de sesión..."
    gcloud auth login "$REQUIRED_ACCOUNT"
fi

# 3. Verificar configuración de Proyecto
gcloud config set project bigquery-388915 --quiet
echo -e "${GREEN}[OK] Proyecto configurado en bigquery-388915.${NC}"

# 4. Verificar Application Default Credentials (ADC)
# Revisamos si existe el archivo de credenciales estándar (esto varía por OS)
ADC_PATH=""
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    ADC_PATH="$APPDATA/gcloud/application_default_credentials.json"
else
    ADC_PATH="$HOME/.config/gcloud/application_default_credentials.json"
fi

if [ ! -f "$ADC_PATH" ]; then
    echo -e "${YELLOW}[AVISO] Application Default Credentials (ADC) no configuradas.${NC}"
    echo "Iniciando proceso de autenticación ADC para Terraform..."
    gcloud auth application-default login
else
    echo -e "${GREEN}[OK] Application Default Credentials encontradas.${NC}"
fi

# 5. Generación de Identidad y Verificación de Entorno
TU_NOMBRE=$(whoami | awk -F'\\' '{print $NF}' | tr '[:upper:] ' '[:lower:]_')
KEY_PATH="$HOME/.ssh/${TU_NOMBRE}_key"
SSH_DIR="$HOME/.ssh"
SSH_CONFIG="${SSH_DIR}/config"

# Crear directorio .ssh si no existe
if [ ! -d "$SSH_DIR" ]; then
    mkdir -p "$SSH_DIR"
    chmod 700 "$SSH_DIR"
fi

echo -e "\n${YELLOW}Configurando SSH para el usuario: $TU_NOMBRE${NC}"

# 6. Generar Clave SSH (Con advertencia de sobrescritura)
if [ -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}[ADVERTENCIA] La clave SSH ya existe en $KEY_PATH.${NC}"
    read -p "¿Desea SOBRESESCRIBIRLA? (y/n): " confirm_key
    if [[ "$confirm_key" =~ ^[sSyY]$ ]]; then
        echo "Generando nueva clave SSH..."
        ssh-keygen -t rsa -f "$KEY_PATH" -N "" -q
    else
        echo -e "${GREEN}[OK] Usando clave SSH existente.${NC}"
    fi
else
    echo "Generando clave SSH en $KEY_PATH..."
    ssh-keygen -t rsa -f "$KEY_PATH" -N "" -q
fi

# 7. Propagar clave a GCP Project Metadata
echo "Sincronizando clave con Google Cloud..."
PUB_KEY_CONTENT=$(cat "${KEY_PATH}.pub")
# El formato correcto para GCP es "username:ssh-rsa [KEY] [COMMENT]"
# Usaremos tu nombre de usuario para que cada persona tenga su cuenta Linux independiente
NEW_ENTRY="${TU_NOMBRE}:${PUB_KEY_CONTENT}"

EXISTING_KEYS=$(gcloud compute project-info describe \
    --flatten="commonInstanceMetadata.items[]" \
    --filter="commonInstanceMetadata.items.key=ssh-keys" \
    --format="value(commonInstanceMetadata.items.value)" 2>/dev/null || echo "")

if ! echo "$EXISTING_KEYS" | grep -q "^${TU_NOMBRE}:"; then
    echo "Añadiendo tu clave a los metadatos del proyecto..."
    EXISTING_KEYS_FILE=$(mktemp)
    if [ -n "$EXISTING_KEYS" ]; then
        echo "$EXISTING_KEYS" > "$EXISTING_KEYS_FILE"
        echo "" >> "$EXISTING_KEYS_FILE"
    fi
    echo "$NEW_ENTRY" >> "$EXISTING_KEYS_FILE"
    gcloud compute project-info add-metadata --metadata-from-file=ssh-keys="$EXISTING_KEYS_FILE"
    rm "$EXISTING_KEYS_FILE"
    echo -e "${GREEN}[OK] Clave propagada exitosamente a GCP.${NC}"
else
    # Si la clave ya existe pero el usuario eligió sobrescribirla localmente, forzamos actualización
    if [[ "$confirm_key" =~ ^[sSyY]$ ]]; then
         echo "Clave local sobrescrita. Actualizando metadatos en GCP..."
         EXISTING_KEYS_FILE=$(mktemp)
         # Eliminamos entradas anteriores de este usuario (tanto las nuevas separadas como las viejas en root)
         echo "$EXISTING_KEYS" | grep -v "^${TU_NOMBRE}:" | grep -v "root:.*${TU_NOMBRE}" > "$EXISTING_KEYS_FILE"
         echo "$NEW_ENTRY" >> "$EXISTING_KEYS_FILE"
         gcloud compute project-info add-metadata --metadata-from-file=ssh-keys="$EXISTING_KEYS_FILE"
         rm "$EXISTING_KEYS_FILE"
         echo -e "${GREEN}[OK] Clave sincronizada en GCP.${NC}"
    else
        echo -e "${GREEN}[OK] Tu clave ya está registrada en el proyecto.${NC}"
    fi
fi

# 8. Actualizar ~/.ssh/config (LIMPIEZA Y REEMPLAZO)
if [ ! -f "$SSH_CONFIG" ]; then
    touch "$SSH_CONFIG"
    chmod 600 "$SSH_CONFIG"
fi

# Detectar si hay configuración previa de los hosts gestionados
HOSTS_TO_CLEAN="abnito airbyte hike-servers hoppscotch"
NEEDS_CONFIG=false
for h in $HOSTS_TO_CLEAN; do
    if grep -q "Host $h" "$SSH_CONFIG"; then
        NEEDS_CONFIG=true
        break
    fi
done

if [ "$NEEDS_CONFIG" = true ]; then
    echo -e "\n${YELLOW}[ADVERTENCIA] Se detectaron configuraciones previas para los hosts de ABN Digital.${NC}"
    read -p "¿Desea LIMPIAR esas entradas y aplicar la nueva configuración? (y/n): " confirm_config
    if [[ ! "$confirm_config" =~ ^[sSyY]$ ]]; then
        echo -e "${YELLOW}Configuración de archivo omitida.${NC}"
        goto_end=true
    fi
fi

if [ "$goto_end" != true ]; then
    echo "Limpiando y actualizando configuración en $SSH_CONFIG..."
    
    # 1. Eliminar el bloque marcado si ya existe
    if grep -q "# --- ABN Digital Config Start ---" "$SSH_CONFIG"; then
        perl -i -0777 -pe 's/# --- ABN Digital Config Start ---.*?# --- ABN Digital Config End ---\n?//gs' "$SSH_CONFIG"
    fi

    # 2. Eliminar cualquier definición suelta de nuestros hosts (muy importante para evitar duplicados)
    # Se usa AWK para una limpieza semántica segura (evita falsos positivos como airbyte-ukelele)
    awk -v hosts_str="$HOSTS_TO_CLEAN" '
        BEGIN {
            split(hosts_str, arr, " ")
            for (i in arr) target_hosts[arr[i]] = 1
            skip = 0
        }
        /^[ \t]*Host[ \t]+/ {
            skip = 0
            for (i=2; i<=NF; i++) {
                h = $i
                sub(/\r$/, "", h)
                if (h in target_hosts) {
                    skip = 1
                    break
                }
            }
        }
        /^[ \t]*Match[ \t]+/ {
            skip = 0
        }
        {
            if (!skip) print $0
        }
    ' "$SSH_CONFIG" > "${SSH_CONFIG}.tmp" && mv "${SSH_CONFIG}.tmp" "$SSH_CONFIG"
    
    # Limpiar líneas vacías excesivas que hayan quedado
    perl -i -0777 -pe 's/\n{3,}/\n\n/g' "$SSH_CONFIG"

    # 3. Preparar el nuevo bloque
    GCLOUD_CMD="gcloud"
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        GCLOUD_CMD="gcloud.cmd"
    fi

    NEW_BLOCK=$(cat <<EOF
# --- ABN Digital Config Start ---
Host airbyte
    User ${TU_NOMBRE}
    IdentityFile ~/.ssh/${TU_NOMBRE}_key
    ProxyCommand ${GCLOUD_CMD} compute start-iap-tunnel %h 22 --listen-on-stdin --project=bigquery-388915 --zone=us-central1-c

Host hoppscotch
    User ${TU_NOMBRE}
    IdentityFile ~/.ssh/${TU_NOMBRE}_key
    ProxyCommand ${GCLOUD_CMD} compute start-iap-tunnel %h 22 --listen-on-stdin --project=bigquery-388915 --zone=us-central1-c
# --- ABN Digital Config End ---
EOF
)

    # 4. Añadir el bloque nuevo al final
    echo -e "\n$NEW_BLOCK" >> "$SSH_CONFIG"
    echo -e "${GREEN}[OK] SSH Config actualizado (limpieza y reemplazo completados).${NC}"
fi

echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN}¡Configuración completada! Ya puedes conectarte usando: ssh airbyte${NC}"
echo -e "${GREEN}==============================================================================${NC}"

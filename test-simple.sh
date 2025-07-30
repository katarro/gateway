#!/bin/bash
# test-simple.sh

# Colores ANSI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ejecutar Jest SIN colores para evitar conflictos, luego aplicamos nuestros colores
npm run test:all --no-colors 2>&1 | \
while IFS= read -r line; do
    # Si la línea contiene PASS o FAIL, mostrarla con colores Y SIN TIEMPO
    if [[ $line =~ ^[[:space:]]*(PASS|FAIL)[[:space:]] ]]; then
        # Remover el tiempo de ejecución (patrón: espacio + paréntesis + número + s + paréntesis)
        line_without_time=$(echo "$line" | sed 's/ ([0-9]*\.[0-9]* s)$//')
        
        if [[ $line == *"FAIL"* ]]; then
            echo -e "${line_without_time/FAIL/${RED}FAIL${NC}}"
        elif [[ $line == *"PASS"* ]]; then
            echo -e "${line_without_time/PASS/${GREEN}PASS${NC}}"
        fi
    # Si es línea del resumen final, mostrarla con colores
    elif [[ $line == "Test Suites:"* ]]; then
        echo ""
        # Usar printf en lugar de echo para los colores
        printf "%s\n" "$line" | sed -E "s/([0-9]+) failed/$(printf '\033[0;31m')\\1 failed$(printf '\033[0m')/g" | sed -E "s/([0-9]+) passed/$(printf '\033[0;32m')\\1 passed$(printf '\033[0m')/g"
    elif [[ $line == "Tests:"* ]]; then
        printf "%s\n" "$line" | sed -E "s/([0-9]+) failed/$(printf '\033[0;31m')\\1 failed$(printf '\033[0m')/g" | sed -E "s/([0-9]+) passed/$(printf '\033[0;32m')\\1 passed$(printf '\033[0m')/g"
    elif [[ $line == "Snapshots:"* ]]; then
        echo "$line"
    elif [[ $line == "Time:"* ]]; then
        echo -e "${YELLOW}$line${NC}"
    fi
done
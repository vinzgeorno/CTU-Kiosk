#!/bin/bash
# start_kiosk.sh - Start all CTU-Kiosk services in separate terminals

PROJECT_DIR="/home/ctukiosk/Documents/Capstone/CTU-Kiosk"

echo "🚀 Starting CTU-Kiosk Services..."
echo "================================"

# Detect available terminal emulator
TERMINAL=""
if command -v gnome-terminal &> /dev/null; then
    TERMINAL="gnome-terminal"
    TERMINAL_CMD="gnome-terminal --"
elif command -v xfce4-terminal &> /dev/null; then
    TERMINAL="xfce4-terminal"
    TERMINAL_CMD="xfce4-terminal -e"
elif command -v lxterminal &> /dev/null; then
    TERMINAL="lxterminal"
    TERMINAL_CMD="lxterminal -e"
elif command -v mate-terminal &> /dev/null; then
    TERMINAL="mate-terminal"
    TERMINAL_CMD="mate-terminal -e"
elif command -v xterm &> /dev/null; then
    TERMINAL="xterm"
    TERMINAL_CMD="xterm -e"
else
    echo "❌ No terminal emulator found!"
    echo "Please install gnome-terminal, xfce4-terminal, lxterminal, mate-terminal, or xterm"
    exit 1
fi

echo "📋 Using terminal: $TERMINAL"
echo ""

# Terminal 1: React Frontend
echo "📱 Starting React Frontend (port 3000) in new window..."
if [ "$TERMINAL" = "gnome-terminal" ]; then
    $TERMINAL_CMD bash -c "$PROJECT_DIR/start_frontend.sh" &
else
    $TERMINAL_CMD bash -c "$PROJECT_DIR/start_frontend.sh; bash" &
fi

# Wait for first terminal to open
sleep 2

# Terminal 2: Node.js Backend
echo "🖥️  Starting Node.js Backend (port 8081) in new window..."
if [ "$TERMINAL" = "gnome-terminal" ]; then
    $TERMINAL_CMD bash -c "$PROJECT_DIR/start_backend.sh" &
else
    $TERMINAL_CMD bash -c "$PROJECT_DIR/start_backend.sh; bash" &
fi

# Wait for second terminal to open
sleep 2

# Terminal 3: Python GPIO/MQTT
echo "🔌 Starting Python GPIO/MQTT Service in new window..."
if [ "$TERMINAL" = "gnome-terminal" ]; then
    $TERMINAL_CMD bash -c "$PROJECT_DIR/start_gpio.sh" &
else
    $TERMINAL_CMD bash -c "$PROJECT_DIR/start_gpio.sh; bash" &
fi

echo ""
echo "✅ All services launched in separate terminals!"
echo ""
echo "📍 Access Points:"
echo "   🎨 Frontend:  http://localhost:3000"
echo "   🖥️  Backend:   http://localhost:8081"
echo "   🔌 GPIO/MQTT: Check the GPIO/MQTT terminal window"
echo ""
echo "📌 To stop services, close each terminal window or press Ctrl+C"
echo ""
wait

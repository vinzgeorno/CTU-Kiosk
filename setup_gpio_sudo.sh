#!/bin/bash
# setup_gpio_sudo.sh - Configure passwordless sudo for GPIO access

echo "🔧 Setting up passwordless sudo for GPIO access..."
echo ""

# Add sudoers entry for gpio script (passwordless)
echo "ctukiosk ALL=(ALL) NOPASSWD: $(which python3)" | sudo tee /etc/sudoers.d/ctu-gpio > /dev/null

# Verify permissions
if [ -f /etc/sudoers.d/ctu-gpio ]; then
    echo "✅ Passwordless sudo configured"
    echo ""
    echo "You can now run:"
    echo "  sudo python3 payment_gpio_mqtt.py"
    echo ""
    echo "without entering a password"
else
    echo "❌ Failed to configure sudoers"
    exit 1
fi

# Alternative: Add user to gpio group
echo ""
echo "📌 Alternative: Add user to gpio group (if available)..."
if grep -q "gpio" /etc/group 2>/dev/null; then
    sudo usermod -a -G gpio ctukiosk
    echo "✅ User added to gpio group"
    echo "   (May need to logout and login for changes to take effect)"
else
    echo "⚠️  gpio group not found"
fi

echo ""
echo "✅ Setup complete!"

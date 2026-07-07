// Shop Settings Layer (CORS-friendly for file:// protocol)

async function getSettings() {
  const settings = await db.get('settings', 'shop_settings');
  return settings || null;
}

async function updateSettings(data) {
  const currentSettings = await getSettings();
  const updatedSettings = {
    ...currentSettings,
    ...data,
    key: 'shop_settings' // ensure key remains unchanged
  };
  await db.put('settings', updatedSettings);

  // Instantly apply settings changes to the UI if relevant
  if (data.theme) {
    applyTheme(data.theme);
  }

  // Trigger an event to let other views know settings have updated
  window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updatedSettings }));

  return updatedSettings;
}

function applyTheme(theme) {
  const htmlEl = document.documentElement;
  if (theme === 'light') {
    htmlEl.classList.remove('dark');
    htmlEl.classList.add('light');
  } else {
    htmlEl.classList.remove('light');
    htmlEl.classList.add('dark');
  }
}

// Expose globally
window.settings = {
  getSettings,
  updateSettings,
  applyTheme
};

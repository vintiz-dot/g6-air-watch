/* Air Watch lesson — small pictures for the six words (book page 30). Plain SVG, drawn for this lesson. */
window.AW_ICONS = {
  pollution: '<svg viewBox="0 0 64 64" role="img" aria-label="A city under a cloud of smoke">' +
    '<rect width="64" height="64" rx="12" fill="#D9DDE0"/>' +
    '<circle cx="17" cy="15" r="7" fill="#8A8F94"/><circle cx="28" cy="12" r="9" fill="#9AA0A6"/><circle cx="40" cy="14" r="8" fill="#8A8F94"/><circle cx="51" cy="12" r="6" fill="#A7ADB2"/>' +
    '<rect x="42" y="27" width="6" height="18" fill="#5B4636"/><circle cx="45" cy="23" r="3.6" fill="#6E6E6E"/><circle cx="49" cy="19" r="3" fill="#7E7E7E"/>' +
    '<rect x="8" y="32" width="10" height="24" rx="1" fill="#46606C"/><rect x="20" y="26" width="11" height="30" rx="1" fill="#3A515C"/><rect x="33" y="37" width="23" height="19" rx="1" fill="#53707D"/>' +
    '<g fill="#F5D400" opacity=".85"><rect x="11" y="36" width="3" height="3"/><rect x="11" y="43" width="3" height="3"/><rect x="23" y="31" width="3" height="3"/><rect x="26" y="38" width="3" height="3"/><rect x="23" y="45" width="3" height="3"/><rect x="37" y="42" width="3" height="3"/><rect x="45" y="48" width="3" height="3"/></g>' +
    '<rect x="6" y="55" width="52" height="3" rx="1.5" fill="#2E3F46"/></svg>',
  quality: '<svg viewBox="0 0 64 64" role="img" aria-label="A dial that goes from good (green) to bad (red)">' +
    '<rect width="64" height="64" rx="12" fill="#E3F1F6"/>' +
    '<path d="M12 42 A20 20 0 0 1 17.86 27.86" stroke="#00A35A" stroke-width="7" fill="none"/>' +
    '<path d="M17.86 27.86 A20 20 0 0 1 32 22" stroke="#F5D400" stroke-width="7" fill="none"/>' +
    '<path d="M32 22 A20 20 0 0 1 46.14 27.86" stroke="#F7922E" stroke-width="7" fill="none"/>' +
    '<path d="M46.14 27.86 A20 20 0 0 1 52 42" stroke="#D7263D" stroke-width="7" fill="none"/>' +
    '<line x1="32" y1="42" x2="23" y2="29" stroke="#1B3742" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="42" r="4" fill="#1B3742"/>' +
    '<path d="M12 53 q4 -3 8 0 t8 0 t8 0 t8 0 t8 0" stroke="#1C7293" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
  pm25: '<svg viewBox="0 0 64 64" role="img" aria-label="A magnifying glass: one hair, and dust much smaller than the hair">' +
    '<defs><clipPath id="awLensClip"><circle cx="27" cy="27" r="16"/></clipPath></defs>' +
    '<rect width="64" height="64" rx="12" fill="#F1EEE8"/><circle cx="27" cy="27" r="16" fill="#FFFFFF"/>' +
    '<g clip-path="url(#awLensClip)"><path d="M6 37 Q27 27 48 35" stroke="#8B5A2B" stroke-width="7" fill="none"/>' +
    '<g fill="#4A4A4A"><circle cx="20" cy="18" r="1.3"/><circle cx="26" cy="14" r="1"/><circle cx="31" cy="20" r="1.4"/><circle cx="36" cy="16" r="1"/><circle cx="22" cy="23" r=".9"/><circle cx="35" cy="24" r="1.1"/><circle cx="16" cy="26" r="1"/><circle cx="29" cy="40" r="1.2"/><circle cx="22" cy="39" r=".9"/><circle cx="35" cy="38" r="1"/></g></g>' +
    '<circle cx="27" cy="27" r="16" fill="none" stroke="#1B3742" stroke-width="4"/><line x1="39" y1="39" x2="53" y2="53" stroke="#1B3742" stroke-width="6" stroke-linecap="round"/></svg>',
  aqi: '<svg viewBox="0 0 64 64" role="img" aria-label="An AQI number, 132, on the colour scale from good to hazardous">' +
    '<rect width="64" height="64" rx="12" fill="#F4F6F7"/>' +
    '<rect x="15" y="7" width="34" height="21" rx="6" fill="#F7922E"/><text x="32" y="23" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="15" fill="#3B1D00">132</text>' +
    '<path d="M24 32 h8 l-4 7 z" fill="#1B3742"/>' +
    '<rect x="8" y="42" width="8" height="10" fill="#00A35A"/><rect x="16" y="42" width="8" height="10" fill="#F5D400"/><rect x="24" y="42" width="8" height="10" fill="#F7922E"/>' +
    '<rect x="32" y="42" width="8" height="10" fill="#D7263D"/><rect x="40" y="42" width="8" height="10" fill="#7B2FA0"/><rect x="48" y="42" width="8" height="10" fill="#7E0023"/></svg>',
  pollutant: '<svg viewBox="0 0 64 64" role="img" aria-label="Harmful particles next to a warning sign">' +
    '<rect width="64" height="64" rx="12" fill="#FBE9E6"/>' +
    '<g stroke="#4A4A4A" stroke-width="3"><line x1="15" y1="31" x2="25" y2="18"/><line x1="25" y1="18" x2="35" y2="29"/></g>' +
    '<circle cx="15" cy="31" r="7" fill="#6B6B6B"/><circle cx="25" cy="18" r="8" fill="#3F3F3F"/><circle cx="35" cy="29" r="6" fill="#6B6B6B"/>' +
    '<path d="M44 30 L57 54 H31 Z" fill="#F5D400" stroke="#3B3000" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<rect x="42.6" y="37" width="2.8" height="9" rx="1" fill="#3B3000"/><circle cx="44" cy="50" r="1.8" fill="#3B3000"/></svg>',
  emission: '<svg viewBox="0 0 64 64" role="img" aria-label="Smoke coming out of a car’s exhaust pipe">' +
    '<rect width="64" height="64" rx="12" fill="#E6EEF3"/>' +
    '<circle cx="10" cy="31" r="4" fill="#9AA0A6"/><circle cx="8" cy="23" r="3.5" fill="#B4B9BD"/><circle cx="14" cy="25" r="3" fill="#A7ADB2"/><circle cx="12" cy="16" r="2.6" fill="#C3C7CA"/>' +
    '<rect x="12" y="40" width="7" height="3" rx="1" fill="#555"/>' +
    '<path d="M18 44 V36 a3 3 0 0 1 3 -3 h5 l5 -7 h13 l5 7 h3 a4 4 0 0 1 4 4 v7 z" fill="#1C7293"/><path d="M32 28 h11 l4 5 h-18 z" fill="#CFE4EE"/>' +
    '<circle cx="26" cy="45" r="5" fill="#1B3742"/><circle cx="26" cy="45" r="2" fill="#CFE4EE"/><circle cx="47" cy="45" r="5" fill="#1B3742"/><circle cx="47" cy="45" r="2" fill="#CFE4EE"/>' +
    '<rect x="6" y="51" width="52" height="2.5" rx="1.2" fill="#9AA0A6"/></svg>'
};

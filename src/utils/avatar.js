// One avatar color strategy for the whole app (TaskCard, Task Drawer, comments, Projects):
// the USER id is the seed, so the same person always gets the same tone. Tones are tokens in style.css.
const AVATAR_TONES = 6;

export function getAvatarTone(userId = "") {
    let h = 0;
    for (const ch of String(userId)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h % AVATAR_TONES;
}

export function avatarToneClass(userId) {
    return `avatar-tone-${getAvatarTone(userId)}`;
}

// "Ngô Lâm" → "NL", "admin" → "AD"; empty → "?"
export function getInitials(name) {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "?";
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
